import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { appUser, authIdentity } from "@/db/schema";
import { BaseAuthProviderAdapter, type ExternalIdentity } from ".";

class ProviderDePrueba extends BaseAuthProviderAdapter<{ sub: string; email?: string }> {
  readonly provider = "https://issuer.example.test";
  readonly protocol = "oidc" as const;

  toIdentity(profile: { sub: string; email?: string }): ExternalIdentity {
    return {
      provider: this.provider,
      providerAccountId: profile.sub,
      email: profile.email,
    };
  }
}

describe("adaptadores de proveedores de auth", () => {
  it("traduce la identidad estable sin implementar el flujo OAuth", () => {
    const adapter = new ProviderDePrueba();

    expect(adapter.toIdentity({ sub: "usuario-123", email: "ana@example.com" })).toEqual({
      provider: "https://issuer.example.test",
      providerAccountId: "usuario-123",
      email: "ana@example.com",
    });
  });
});

describe("esquema de identidades de auth", () => {
  it("mantiene password_hash nullable", () => {
    expect(appUser.passwordHash.notNull).toBe(false);
  });

  it("mantiene la unicidad de provider y provider_account_id", () => {
    const indexes = getTableConfig(authIdentity).indexes;
    const identityIndex = indexes.find(
      (index) => index.config.name === "uq_auth_identity_provider_account",
    );

    expect(identityIndex?.config.unique).toBe(true);
    const identityColumns = identityIndex?.config.columns as
      | Array<{ name: string }>
      | undefined;
    expect(identityColumns?.map((column) => column.name)).toEqual([
      "provider",
      "provider_account_id",
    ]);
  });
});
