import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { GoogleOAuthAdapter, getGoogleOAuthConfig } from "@/services/auth/providers";
import { generateOAuthFlowState, resolveLocale, setOAuthFlowCookies } from "@/services/auth/oauth-flow";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

function errorRedirect(locale: string, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/${locale}/auth/error?code=${code}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const url = new URL(request.url);
  const locale = resolveLocale(url.searchParams.get("locale"));

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`oauth:start:ip:${ip}`])) {
    return errorRedirect(locale, "RATE_LIMITED");
  }

  let config;
  try {
    config = getGoogleOAuthConfig();
  } catch {
    throw new ApiError("OAUTH_CONFIG_MISSING", 503, "Google OAuth no está configurado");
  }

  const adapter = new GoogleOAuthAdapter();
  const flowState = generateOAuthFlowState(locale);
  await setOAuthFlowCookies(flowState);

  const authUrl = adapter.buildAuthUrl({
    state: flowState.state,
    codeChallenge: flowState.codeChallenge,
    codeChallengeMethod: "S256",
    nonce: flowState.nonce,
    redirectUri: config.redirectUri,
  });

  return NextResponse.redirect(authUrl);
});