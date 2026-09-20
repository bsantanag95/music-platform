import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  class EmailConfigError extends Error {}
  return {
    EmailConfigError,
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    consumeAuthAttempt: vi.fn(() => true),
    getEmailTransport: vi.fn(() => ({ send: vi.fn() })),
    resolveLocale: vi.fn((value?: string) => (value === "en" ? "en" : "es")),
  };
});

vi.mock("@/services/auth/password-reset", () => ({
  requestPasswordReset: mocks.requestPasswordReset,
}));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  getAuthClientIp: () => "127.0.0.1",
}));
vi.mock("@/services/auth/oauth-flow", () => ({ resolveLocale: mocks.resolveLocale }));
vi.mock("@/services/email", () => ({
  getEmailTransport: mocks.getEmailTransport,
  EmailConfigError: mocks.EmailConfigError,
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/password/forgot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password/forgot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
    mocks.getEmailTransport.mockReturnValue({ send: vi.fn() });
    mocks.resolveLocale.mockImplementation((value?: string) => (value === "en" ? "en" : "es"));
  });

  it("responde 202 genérico y dispara el envío para un email válido", async () => {
    const response = await POST(request({ email: "Ana@Example.com", locale: "en" }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("ana@example.com", "en");
  });

  it("responde 202 igual aunque el email no tenga cuenta (no hay señal de existencia)", async () => {
    mocks.requestPasswordReset.mockResolvedValueOnce(undefined);
    const response = await POST(request({ email: "nadie@example.com" }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rechaza un email mal formado con 400", async () => {
    const response = await POST(request({ email: "no-es-un-email" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("aplica rate limit sin revelar nada", async () => {
    mocks.consumeAuthAttempt.mockReturnValue(false);
    const response = await POST(request({ email: "ana@example.com" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("falla cerrado con 503 si no hay transporte de email configurado", async () => {
    mocks.getEmailTransport.mockImplementation(() => {
      throw new mocks.EmailConfigError();
    });
    const response = await POST(request({ email: "ana@example.com" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "EMAIL_CONFIG_MISSING" });
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });
});
