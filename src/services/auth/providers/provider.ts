import type {
  AuthProviderProtocol,
  ExternalIdentity,
  GoogleIdTokenClaims,
  OAuthFlowParams,
  OAuthTokenResponse,
} from "./types";

export interface AuthProviderAdapter {
  readonly provider: string;
  readonly protocol: AuthProviderProtocol;
  buildAuthUrl(params: OAuthFlowParams): string;
  exchangeCode(code: string, codeVerifier: string): Promise<OAuthTokenResponse>;
  validateIdToken(idToken: string, nonce: string): Promise<GoogleIdTokenClaims>;
  toIdentity(claims: GoogleIdTokenClaims): ExternalIdentity;
}
