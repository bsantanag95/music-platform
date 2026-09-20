import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  class EmailConfigError extends Error {}
  return {
    EmailConfigError,
    resolveSession: vi.fn(),
    resendEmailVerification: vi.fn(),
    consumeAuthAttempt: vi.fn(() => true),
    resolveLocale: vi.fn((value?: string) => (value === "en" ? "en" : "es")),
  };
});

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/auth/email-verification", () => ({
  resendEmailVerification: mocks.resendEmailVerification,
}));
vi.mock("@/services/auth/oauth-flow", () => ({ resolveLocale: mocks.resolveLocale }));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  getAuthClientIp: () => "127.0.0.1",
}));
vi.mock("@/services/email", () => ({ EmailConfigError: mocks.EmailConfigError }));

import { POST } from "./route";

function request(body: unknown = {}) {
  return new NextRequest("http://localhost/api/auth/email/verify/resend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/email/verify/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
    mocks.resolveLocale.mockImplementation((value?: string) => (value === "en" ? "en" : "es"));
  });

  it("reenvía para una cuenta sin verificar y responde 200", async () => {
    mocks.resolveSession.mockResolvedValue({ sessionId: "s1", user: { id: "u1" } });
    mocks.resendEmailVerification.mockResolvedValue("sent");

    const response = await POST(request({ locale: "en" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.resendEmailVerification).toHaveBeenCalledWith("u1", "en");
    expect(mocks.consumeAuthAttempt).toHaveBeenCalledOnce();
  });

  it("responde 409 si la cuenta ya está verificada", async () => {
    mocks.resolveSession.mockResolvedValue({ sessionId: "s1", user: { id: "u1" } });
    mocks.resendEmailVerification.mockResolvedValue("already_verified");

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "EMAIL_ALREADY_VERIFIED" });
  });

  it("rechaza un body con locale inválido con 400", async () => {
    mocks.resolveSession.mockResolvedValue({ sessionId: "s1", user: { id: "u1" } });

    const response = await POST(request({ locale: 123 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.resendEmailVerification).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    mocks.resolveSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.resendEmailVerification).not.toHaveBeenCalled();
  });

  it("responde 503 si no hay transporte de email configurado", async () => {
    mocks.resolveSession.mockResolvedValue({ sessionId: "s1", user: { id: "u1" } });
    mocks.resendEmailVerification.mockRejectedValue(new mocks.EmailConfigError());

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "EMAIL_CONFIG_MISSING" });
  });

  it("aplica rate limit", async () => {
    mocks.resolveSession.mockResolvedValue({ sessionId: "s1", user: { id: "u1" } });
    mocks.consumeAuthAttempt.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mocks.resendEmailVerification).not.toHaveBeenCalled();
  });
});
