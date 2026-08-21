import type { AuthIdentityRow } from "@/db/schema";

export type AuthProviderProtocol = "oauth2" | "oidc";

export type ExternalIdentity = Pick<AuthIdentityRow, "provider" | "providerAccountId"> & {
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
};

export interface OAuthFlowParams {
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  nonce: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  idToken: string;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  nonce: string;
}
