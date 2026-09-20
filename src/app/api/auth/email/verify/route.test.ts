import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  consumeAuthAttempt: vi.fn(() => true),
}));

vi.mock("@/services/auth/email-verification", () => ({ verifyEmail: mocks.verifyEmail }));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  getAuthClientIp: () => "127.0.0.1",
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/email/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/email/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
  });

  it("verifica con un token válido y responde 200", async () => {
    mocks.verifyEmail.mockResolvedValue(true);
    const response = await POST(request({ token: "tok" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.verifyEmail).toHaveBeenCalledWith("tok");
  });

  it("responde 400 INVALID_VERIFICATION_TOKEN si el token no es válido", async () => {
    mocks.verifyEmail.mockResolvedValue(false);
    const response = await POST(request({ token: "bad" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
  });

  it("rechaza un body sin token con 400", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.verifyEmail).not.toHaveBeenCalled();
  });

  it("aplica rate limit", async () => {
    mocks.consumeAuthAttempt.mockReturnValue(false);
    const response = await POST(request({ token: "tok" }));
    expect(response.status).toBe(429);
    expect(mocks.verifyEmail).not.toHaveBeenCalled();
  });
});
