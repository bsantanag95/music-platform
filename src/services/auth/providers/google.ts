import { createRemoteJWKSet, jwtVerify } from "jose";
import { BaseAuthProviderAdapter } from "./base";
import {
  getGoogleOAuthConfig,
  GOOGLE_AUTH_URL,
  GOOGLE_ISSUER,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
} from "./google-config";
import type {
  ExternalIdentity,
  GoogleIdTokenClaims,
  OAuthFlowParams,
  OAuthTokenResponse,
} from "./types";

const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export class GoogleOAuthAdapter extends BaseAuthProviderAdapter {
  readonly provider = "google";
  readonly protocol = "oidc" as const;

  buildAuthUrl(params: OAuthFlowParams): string {
    const config = getGoogleOAuthConfig();
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes);
    url.searchParams.set("state", params.state);
    url.searchParams.set("code_challenge", params.codeChallenge);
    url.searchParams.set("code_challenge_method", params.codeChallengeMethod);
    url.searchParams.set("nonce", params.nonce);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthTokenResponse> {
    const config = getGoogleOAuthConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Google token endpoint respondió ${response.status}`);
    }

    const data = (await response.json()) as {
      id_token: string;
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      idToken: data.id_token,
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  async validateIdToken(idToken: string, nonce: string): Promise<GoogleIdTokenClaims> {
    const config = getGoogleOAuthConfig();

    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: GOOGLE_ISSUER,
      audience: config.clientId,
      algorithms: ["RS256"],
    });

    if (payload.nonce !== nonce) {
      throw new Error("El nonce del ID token no coincide con el esperado");
    }

    if (!payload.sub || !payload.email) {
      throw new Error("El ID token no contiene los claims requeridos (sub, email)");
    }

    return {
      sub: payload.sub,
      email: payload.email as string,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      nonce: typeof payload.nonce === "string" ? payload.nonce : "",
    };
  }

  toIdentity(claims: GoogleIdTokenClaims): ExternalIdentity {
    return {
      provider: this.provider,
      providerAccountId: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
      displayName: claims.name,
    };
  }
}
