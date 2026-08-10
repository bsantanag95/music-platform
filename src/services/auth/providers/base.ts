import type { AuthProviderAdapter } from "./provider";
import type { AuthProviderProtocol, ExternalIdentity } from "./types";

export abstract class BaseAuthProviderAdapter<TProfile> implements AuthProviderAdapter<TProfile> {
  abstract readonly provider: string;
  abstract readonly protocol: AuthProviderProtocol;

  abstract toIdentity(profile: TProfile): ExternalIdentity;
}
