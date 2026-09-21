import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { GoogleOAuthAdapter, getGoogleOAuthConfig } from "@/services/auth/providers";
import { consumeOAuthFlowCookies, isAccountIntent, resolveLocale, type OAuthFlowState } from "@/services/auth/oauth-flow";
import {
  findIdentityByProvider,
  linkIdentityToUser,
  resolveOrCreateOAuthUser,
} from "@/services/auth/identities";
import type { ExternalIdentity } from "@/services/auth/providers";
import { createSession, resolveSession, rotateCurrentSession, setSessionCookie } from "@/services/auth/sessions";
import { clearAuthAttempts, consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

function errorRedirect(locale: string, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/${locale}/auth/error?code=${code}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

// Destino FIJO de las intenciones `link` y `reauth` (spec google-oauth): no
// depende de ningún parámetro de la petición. El resultado viaja en el query
// para que Ajustes muestre el aviso; los códigos de error son un conjunto
// cerrado que la pantalla localiza.
function settingsRedirect(locale: string, query: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/${locale}/me/settings/account?${query}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  );
}

// Vincular Google a la cuenta de la sesión, o confirmar que la persona sigue
// siendo quien dice ser (autenticación reciente). Exige que la sesión sea la
// misma que inició el flujo.
async function completeAccountIntent(
  flowState: OAuthFlowState,
  identity: ExternalIdentity,
  locale: string,
): Promise<NextResponse> {
  const current = await resolveSession();
  if (!current || current.user.id !== flowState.userId) {
    return errorRedirect(locale, "OAUTH_STATE_INVALID");
  }

  if (flowState.intent === "link") {
    try {
      await linkIdentityToUser(current.user.id, identity);
    } catch (error) {
      if (error instanceof Error && error.message === "OAUTH_IDENTITY_TAKEN") {
        return settingsRedirect(locale, "google=error&code=OAUTH_IDENTITY_TAKEN");
      }
      throw error;
    }
    return settingsRedirect(locale, "google=linked");
  }

  // reauth: la identidad de Google tiene que ser la vinculada a ESTA cuenta.
  const existing = await findIdentityByProvider(identity.provider, identity.providerAccountId);
  if (!existing || existing.user.id !== current.user.id) {
    return settingsRedirect(locale, "google=error&code=OAUTH_IDENTITY_MISMATCH");
  }
  const session = await rotateCurrentSession(current.user.id);
  const response = settingsRedirect(locale, "google=confirmed");
  setSessionCookie(response, session.token);
  return response;
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

  if (isAccountIntent(flowState.intent)) {
    clearAuthAttempts(rateLimitKeys);
    return completeAccountIntent(flowState, identity, locale);
  }

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

  // Un usuario sin onboarding completado (alta nueva, o preexistente sin la
  // marca) entra por /welcome; el resto, al destino habitual
  // (cambio add-two-door-onboarding).
  // La preferencia de idioma guardada en la cuenta manda sobre el idioma desde el
  // que se inició el flujo (spec account-preferences).
  const destinationLocale = resolveLocale(user.locale ?? locale);
  const destination = user.onboardedAt ? `/${destinationLocale}` : `/${destinationLocale}/welcome`;
  const response = NextResponse.redirect(
    new URL(destination, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  );
  setSessionCookie(response, session.token);
  return response;
});