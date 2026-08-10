import type { AuthIdentityRow } from "@/db/schema";

export type AuthProviderProtocol = "oauth2" | "oidc";

export type ExternalIdentity = Pick<AuthIdentityRow, "provider" | "providerAccountId"> & {
  email?: string;
  displayName?: string;
};
