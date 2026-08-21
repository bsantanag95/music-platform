import type { AuthProviderAdapter } from "./provider";
import type {
  AuthProviderProtocol,
  ExternalIdentity,
  GoogleIdTokenClaims,
  OAuthFlowParams,
  OAuthTokenResponse,
} from "./types";

export abstract class BaseAuthProviderAdapter implements AuthProviderAdapter {
  abstract readonly provider: string;
  abstract readonly protocol: AuthProviderProtocol;

  abstract buildAuthUrl(params: OAuthFlowParams): string;
  abstract exchangeCode(code: string, codeVerifier: string): Promise<OAuthTokenResponse>;
  abstract validateIdToken(idToken: string, nonce: string): Promise<GoogleIdTokenClaims>;
  abstract toIdentity(claims: GoogleIdTokenClaims): ExternalIdentity;
}
