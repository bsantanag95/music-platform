import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleOAuthAdapter } from "./google";

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn().mockReturnValue("jwks"),
}));

vi.mock("jose", () => ({
  jwtVerify: mocks.jwtVerify,
  createRemoteJWKSet: mocks.createRemoteJWKSet,
}));

function setGoogleEnv(): void {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
  process.env.GOOGLE_OAUTH_SCOPES = "openid email profile";
}

describe("GoogleOAuthAdapter", () => {
  beforeEach(() => {
    setGoogleEnv();
    vi.clearAllMocks();
  });

  describe("buildAuthUrl", () => {
    it("construye la URL de autorización con todos los parámetros requeridos", () => {
      const adapter = new GoogleOAuthAdapter();
      const url = adapter.buildAuthUrl({
        state: "test-state",
        codeChallenge: "test-challenge",
        codeChallengeMethod: "S256",
        nonce: "test-nonce",
        redirectUri: "http://localhost:3000/api/auth/google/callback",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("scope")).toBe("openid email profile");
      expect(parsed.searchParams.get("state")).toBe("test-state");
      expect(parsed.searchParams.get("code_challenge")).toBe("test-challenge");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      expect(parsed.searchParams.get("nonce")).toBe("test-nonce");
    });
  });

  describe("exchangeCode", () => {
    it("intercambia el código por tokens", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id_token: "id-token",
          access_token: "access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const adapter = new GoogleOAuthAdapter();
      const result = await adapter.exchangeCode("auth-code", "code-verifier");

      expect(result.idToken).toBe("id-token");
      expect(result.accessToken).toBe("access-token");
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresIn).toBe(3600);

      vi.unstubAllGlobals();
    });

    it("lanza error si el endpoint responde con error", async () => {
      const mockResponse = { ok: false, status: 400 };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const adapter = new GoogleOAuthAdapter();
      await expect(adapter.exchangeCode("bad-code", "verifier")).rejects.toThrow(
        "Google token endpoint respondió 400",
      );

      vi.unstubAllGlobals();
    });
  });

  describe("validateIdToken", () => {
    it("valida un ID token correcto y extrae los claims", async () => {
      mocks.jwtVerify.mockResolvedValue({
        payload: {
          sub: "google-sub-123",
          email: "user@gmail.com",
          email_verified: true,
          name: "Test User",
          nonce: "expected-nonce",
        },
      });

      const adapter = new GoogleOAuthAdapter();
      const claims = await adapter.validateIdToken("valid-id-token", "expected-nonce");

      expect(claims.sub).toBe("google-sub-123");
      expect(claims.email).toBe("user@gmail.com");
      expect(claims.emailVerified).toBe(true);
      expect(claims.name).toBe("Test User");
      expect(claims.nonce).toBe("expected-nonce");
    });

    it("pinea el algoritmo RS256 al verificar la firma", async () => {
      mocks.jwtVerify.mockResolvedValue({
        payload: {
          sub: "google-sub-123",
          email: "user@gmail.com",
          email_verified: true,
          nonce: "n",
        },
      });

      const adapter = new GoogleOAuthAdapter();
      await adapter.validateIdToken("token", "n");

      expect(mocks.jwtVerify).toHaveBeenCalledWith(
        "token",
        "jwks",
        expect.objectContaining({ algorithms: ["RS256"] }),
      );
    });

    it("rechaza un nonce incorrecto", async () => {
      mocks.jwtVerify.mockResolvedValue({
        payload: {
          sub: "google-sub-123",
          email: "user@gmail.com",
          email_verified: true,
          nonce: "wrong-nonce",
        },
      });

      const adapter = new GoogleOAuthAdapter();
      await expect(
        adapter.validateIdToken("token", "expected-nonce"),
      ).rejects.toThrow("nonce del ID token no coincide");
    });

    it("rechaza un token sin sub", async () => {
      mocks.jwtVerify.mockResolvedValue({
        payload: {
          email: "user@gmail.com",
          email_verified: true,
          nonce: "n",
        },
      });

      const adapter = new GoogleOAuthAdapter();
      await expect(
        adapter.validateIdToken("token", "n"),
      ).rejects.toThrow("claims requeridos");
    });
  });

  describe("toIdentity", () => {
    it("traduce los claims a ExternalIdentity", () => {
      const adapter = new GoogleOAuthAdapter();
      const identity = adapter.toIdentity({
        sub: "google-sub-123",
        email: "user@gmail.com",
        emailVerified: true,
        name: "Test User",
        nonce: "n",
      });

      expect(identity).toEqual({
        provider: "google",
        providerAccountId: "google-sub-123",
        email: "user@gmail.com",
        emailVerified: true,
        displayName: "Test User",
      });
    });
  });
});
