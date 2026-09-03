import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const buildAuthUrl = vi.fn();
  const exchangeCode = vi.fn();
  const validateIdToken = vi.fn();
  const toIdentity = vi.fn();

  class MockGoogleOAuthAdapter {
    buildAuthUrl = buildAuthUrl;
    exchangeCode = exchangeCode;
    validateIdToken = validateIdToken;
    toIdentity = toIdentity;
  }

  return {
    getGoogleOAuthConfig: vi.fn(),
    generateOAuthFlowState: vi.fn(),
    setOAuthFlowCookies: vi.fn(),
    consumeOAuthFlowCookies: vi.fn(),
    resolveOrCreateOAuthUser: vi.fn(),
    createSession: vi.fn(),
    rotateCurrentSession: vi.fn(),
    resolveSession: vi.fn(),
    consumeAuthAttempt: vi.fn(() => true),
    getAuthClientIp: vi.fn(() => "127.0.0.1"),
    buildAuthUrl,
    exchangeCode,
    validateIdToken,
    toIdentity,
    MockGoogleOAuthAdapter,
  };
});

vi.mock("@/services/auth/providers", () => ({
  getGoogleOAuthConfig: mocks.getGoogleOAuthConfig,
  GoogleOAuthAdapter: mocks.MockGoogleOAuthAdapter,
}));
vi.mock("@/services/auth/oauth-flow", () => ({
  generateOAuthFlowState: mocks.generateOAuthFlowState,
  setOAuthFlowCookies: mocks.setOAuthFlowCookies,
  consumeOAuthFlowCookies: mocks.consumeOAuthFlowCookies,
  resolveLocale: (value: string | null | undefined) => (value === "es" || value === "en" ? value : "es"),
}));
vi.mock("@/services/auth/identities", () => ({
  resolveOrCreateOAuthUser: mocks.resolveOrCreateOAuthUser,
}));
vi.mock("@/services/auth/sessions", () => ({
  createSession: mocks.createSession,
  rotateCurrentSession: mocks.rotateCurrentSession,
  resolveSession: mocks.resolveSession,
  setSessionCookie: vi.fn(),
}));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  getAuthClientIp: mocks.getAuthClientIp,
  clearAuthAttempts: vi.fn(),
}));

import { GET as startGet } from "./start/route";
import { GET as callbackGet } from "./callback/route";

function mockConfig(): void {
  mocks.getGoogleOAuthConfig.mockReturnValue({
    clientId: "test-client-id",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:3000/api/auth/google/callback",
    scopes: "openid email profile",
  });
}

function startRequest(locale = "es"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/auth/google/start?locale=${locale}`);
}

describe("GET /api/auth/google/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
    mockConfig();
    mocks.generateOAuthFlowState.mockReturnValue({
      state: "test-state",
      codeVerifier: "verifier",
      codeChallenge: "challenge",
      nonce: "nonce",
      locale: "es",
    });
    mocks.buildAuthUrl.mockReturnValue("https://accounts.google.com/auth?state=test-state");
  });

  it("redirige a Google con los parámetros correctos", async () => {
    const response = await startGet(startRequest());

    expect(response.status).toBe(307);
    expect(mocks.setOAuthFlowCookies).toHaveBeenCalledWith(
      expect.objectContaining({ state: "test-state" }),
    );
    expect(mocks.buildAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "test-state",
        codeChallenge: "challenge",
        nonce: "nonce",
      }),
    );
  });

  it("persiste el locale del query en el estado del flujo", async () => {
    await startGet(startRequest("en"));

    expect(mocks.generateOAuthFlowState).toHaveBeenCalledWith("en");
  });

  it("falla si la configuración de Google está ausente", async () => {
    mocks.getGoogleOAuthConfig.mockImplementation(() => {
      throw new Error("Faltan variables");
    });

    const response = await startGet(startRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("OAUTH_CONFIG_MISSING");
  });

  it("redirige a la página de error si supera el rate limit", async () => {
    mocks.consumeAuthAttempt.mockReturnValue(false);

    const response = await startGet(startRequest());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("auth/error?code=RATE_LIMITED");
  });
});

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
    mockConfig();
    mocks.resolveSession.mockResolvedValue(null);
    mocks.createSession.mockResolvedValue({ token: "session-token", expiresAt: new Date() });
  });

  it("redirige a error si Google devuelve un error", async () => {
    const url = "http://localhost:3000/api/auth/google/callback?error=access_denied&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("auth/error?code=OAUTH_CANCELLED");
  });

  it("redirige a error si falta code o state", async () => {
    const url = "http://localhost:3000/api/auth/google/callback?locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("OAUTH_CALLBACK_INVALID");
  });

  it("no permite un locale malicioso abriendo una redirección externa", async () => {
    const url = "http://localhost:3000/api/auth/google/callback?error=access_denied&locale=//evil.com";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(new URL(location).origin).toBe("http://localhost:3000");
    expect(location).toContain("auth/error?code=OAUTH_CANCELLED");
  });

  it("usa el locale persistido del flujo para un error temprano, no el query", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "valid-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "en",
    });

    const url = "http://localhost:3000/api/auth/google/callback?error=access_denied&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toContain("/en/auth/error?code=OAUTH_CANCELLED");
  });

  it("redirige a error si el state no coincide", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "expected-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "es",
    });

    const url = "http://localhost:3000/api/auth/google/callback?code=auth-code&state=wrong-state&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("OAUTH_STATE_INVALID");
  });

  it("redirige a error si el email ya pertenece a una cuenta local", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "valid-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "es",
    });
    mocks.exchangeCode.mockResolvedValue({ idToken: "id-token", accessToken: "at", tokenType: "Bearer", expiresIn: 3600 });
    mocks.validateIdToken.mockResolvedValue({ sub: "sub-123", email: "local@example.com", emailVerified: true, nonce: "nonce" });
    mocks.toIdentity.mockReturnValue({ provider: "google", providerAccountId: "sub-123", email: "local@example.com", emailVerified: true });
    mocks.resolveOrCreateOAuthUser.mockRejectedValue(new Error("EMAIL_TAKEN_BY_LOCAL"));

    const url = "http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("EMAIL_TAKEN_BY_LOCAL");
  });

  it("redirige a error si el email de Google no está verificado", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "valid-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "es",
    });
    mocks.exchangeCode.mockResolvedValue({ idToken: "id-token", accessToken: "at", tokenType: "Bearer", expiresIn: 3600 });
    mocks.validateIdToken.mockResolvedValue({ sub: "sub-123", email: "new@gmail.com", emailVerified: false, nonce: "nonce" });
    mocks.toIdentity.mockReturnValue({ provider: "google", providerAccountId: "sub-123", email: "new@gmail.com", emailVerified: false });
    mocks.resolveOrCreateOAuthUser.mockRejectedValue(new Error("OAUTH_EMAIL_NOT_VERIFIED"));

    const url = "http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("OAUTH_EMAIL_NOT_VERIFIED");
  });

  it("completa el flujo feliz y redirige al home con el locale del flujo", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "valid-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "en",
    });
    mocks.exchangeCode.mockResolvedValue({ idToken: "id-token", accessToken: "at", tokenType: "Bearer", expiresIn: 3600 });
    mocks.validateIdToken.mockResolvedValue({ sub: "sub-123", email: "new@gmail.com", emailVerified: true, nonce: "nonce" });
    mocks.toIdentity.mockReturnValue({ provider: "google", providerAccountId: "sub-123", email: "new@gmail.com", emailVerified: true });
    mocks.resolveOrCreateOAuthUser.mockResolvedValue({ id: "new-user", username: "new", email: "new@gmail.com", displayName: null });

    const url = "http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/en");
    expect(mocks.createSession).toHaveBeenCalledWith("new-user");
  });

  it("rota la sesión existente si ya hay una", async () => {
    mocks.consumeOAuthFlowCookies.mockResolvedValue({
      state: "valid-state",
      codeVerifier: "verifier",
      nonce: "nonce",
      locale: "es",
    });
    mocks.exchangeCode.mockResolvedValue({ idToken: "id-token", accessToken: "at", tokenType: "Bearer", expiresIn: 3600 });
    mocks.validateIdToken.mockResolvedValue({ sub: "sub-123", email: "new@gmail.com", emailVerified: true, nonce: "nonce" });
    mocks.toIdentity.mockReturnValue({ provider: "google", providerAccountId: "sub-123", email: "new@gmail.com", emailVerified: true });
    mocks.resolveOrCreateOAuthUser.mockResolvedValue({ id: "new-user", username: "new", email: "new@gmail.com", displayName: null });
    mocks.resolveSession.mockResolvedValue({ id: "s1" });
    mocks.rotateCurrentSession.mockResolvedValue({ token: "rotated-token", expiresAt: new Date() });

    const url = "http://localhost:3000/api/auth/google/callback?code=auth-code&state=valid-state&locale=es";
    const request = new NextRequest(url);
    const response = await callbackGet(request);

    expect(response.status).toBe(307);
    expect(mocks.rotateCurrentSession).toHaveBeenCalledWith("new-user");
  });
});