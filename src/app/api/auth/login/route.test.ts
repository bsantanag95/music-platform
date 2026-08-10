import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  rotateCurrentSession: vi.fn(),
  setSessionCookie: vi.fn(),
  consumeAuthAttempt: vi.fn(() => true),
  clearAuthAttempts: vi.fn(),
}));
const { authenticateUser, rotateCurrentSession, setSessionCookie, consumeAuthAttempt } = mocks;

vi.mock("@/services/auth/users", () => ({ authenticateUser: mocks.authenticateUser }));
vi.mock("@/services/auth/sessions", () => ({ rotateCurrentSession: mocks.rotateCurrentSession, setSessionCookie: mocks.setSessionCookie }));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  clearAuthAttempts: mocks.clearAuthAttempts,
  getAuthClientIp: () => "127.0.0.1",
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeAuthAttempt.mockReturnValue(true);
  });

  it("devuelve un error genérico para credenciales inválidas", async () => {
    authenticateUser.mockResolvedValue(null);
    const response = await POST(request({ identifier: "ana", password: "incorrecta" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("rota la sesión tras un login válido", async () => {
    authenticateUser.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001", username: "ana", email: "ana@example.com", displayName: null });
    rotateCurrentSession.mockResolvedValue({ token: "opaque", expiresAt: new Date() });
    const response = await POST(request({ identifier: "ana@example.com", password: "correcta" }));
    expect(response.status).toBe(200);
    expect(rotateCurrentSession).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
    expect(setSessionCookie).toHaveBeenCalledWith(response, "opaque");
  });

  it("rechaza cuando se supera el rate limit", async () => {
    consumeAuthAttempt.mockReturnValue(false);
    const response = await POST(request({ identifier: "ana", password: "correcta" }));
    expect(response.status).toBe(429);
    expect(authenticateUser).not.toHaveBeenCalled();
    consumeAuthAttempt.mockReturnValue(true);
  });
});
