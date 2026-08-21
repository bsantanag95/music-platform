import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { GoogleOAuthAdapter, getGoogleOAuthConfig } from "@/services/auth/providers";
import { consumeOAuthFlowCookies, resolveLocale } from "@/services/auth/oauth-flow";
import { resolveOrCreateOAuthUser } from "@/services/auth/identities";
import { createSession, resolveSession, rotateCurrentSession, setSessionCookie } from "@/services/auth/sessions";
import { clearAuthAttempts, consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

function errorRedirect(locale: string, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/${locale}/auth/error?code=${code}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url);
  const queryLocale = resolveLocale(url.searchParams.get("locale"));

  // Google no reenvía el query `locale` del /start en su redirect al callback
  // (la URL es redirect_uri + code/error + state). El locale real del flujo vive
  // en la cookie oauth_state; se consume una sola vez y se usa para TODOS los
  // redirects (éxito y error), con el query whitelist-validado solo como fallback
  // si la cookie falta o expiró.
  const flowState = await consumeOAuthFlowCookies();
  const locale = flowState ? flowState.locale : queryLocale;

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return errorRedirect(locale, "OAUTH_CANCELLED");
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam) {
    return errorRedirect(locale, "OAUTH_CALLBACK_INVALID");
  }

  if (!flowState || flowState.state !== stateParam) {
    return errorRedirect(locale, "OAUTH_STATE_INVALID");
  }

  try {
    getGoogleOAuthConfig();
  } catch {
    return errorRedirect(locale, "OAUTH_CONFIG_MISSING");
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  const rateLimitKeys = [`oauth:callback:ip:${ip}`];
  if (!consumeAuthAttempt(rateLimitKeys)) {
    return errorRedirect(locale, "RATE_LIMITED");
  }

  const adapter = new GoogleOAuthAdapter();

  let tokenResponse;
  try {
    tokenResponse = await adapter.exchangeCode(code, flowState.codeVerifier);
  } catch {
    return errorRedirect(locale, "OAUTH_CALLBACK_INVALID");
  }
  let claims;
  try {
    claims = await adapter.validateIdToken(tokenResponse.idToken, flowState.nonce);
  } catch {
    return errorRedirect(locale, "OAUTH_TOKEN_INVALID");
  }

  const identity = adapter.toIdentity(claims);

  let user;
  try {
    user = await resolveOrCreateOAuthUser(identity);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_TAKEN_BY_LOCAL") {
      return errorRedirect(locale, "EMAIL_TAKEN_BY_LOCAL");
    }
    if (error instanceof Error && error.message === "OAUTH_EMAIL_NOT_VERIFIED") {
      return errorRedirect(locale, "OAUTH_EMAIL_NOT_VERIFIED");
    }
    throw error;
  }

  clearAuthAttempts(rateLimitKeys);

  const existing = await resolveSession();
  const session = existing
    ? await rotateCurrentSession(user.id)
    : await createSession(user.id);

  const response = NextResponse.redirect(
    new URL(`/${locale}/search`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  );
  setSessionCookie(response, session.token);
  return response;
});