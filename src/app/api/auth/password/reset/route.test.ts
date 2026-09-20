import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  consumeAuthAttempt: vi.fn(() => true),
  clearAuthAttempts: vi.fn(),
}));

vi.mock("@/services/auth/password-reset", () => ({ resetPassword: mocks.resetPassword }));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  clearAuthAttempts: mocks.clearAuthAttempts,
  getAuthClientIp: () => "127.0.0.1",
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/password/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password/reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
  });

  it("actualiza la contraseña y responde 200", async () => {
    mocks.resetPassword.mockResolvedValue("ok");
    const response = await POST(request({ token: "tok", password: "new-password" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.resetPassword).toHaveBeenCalledWith("tok", "new-password");
    expect(mocks.clearAuthAttempts).toHaveBeenCalledOnce();
  });

  it("responde 400 INVALID_RESET_TOKEN si el token no es válido", async () => {
    mocks.resetPassword.mockResolvedValue("invalid_token");
    const response = await POST(request({ token: "bad", password: "new-password" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect(mocks.clearAuthAttempts).not.toHaveBeenCalled();
  });

  it("responde 400 PASSWORD_REUSED si la contraseña es la actual", async () => {
    mocks.resetPassword.mockResolvedValue("password_reused");
    const response = await POST(request({ token: "tok", password: "old-password" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "PASSWORD_REUSED" });
    expect(mocks.clearAuthAttempts).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña fuera de la política con 400", async () => {
    const response = await POST(request({ token: "tok", password: "corta" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("aplica rate limit por IP", async () => {
    mocks.consumeAuthAttempt.mockReturnValue(false);
    const response = await POST(request({ token: "tok", password: "new-password" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});
