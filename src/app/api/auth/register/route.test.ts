import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Registro local (openspec: add-terms-acceptance): sin la casilla de los Términos no hay alta.
const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
  consumeAuthAttempt: vi.fn(() => true),
  requestEmailVerification: vi.fn(),
}));

vi.mock("@/services/auth/users", () => ({ registerUser: mocks.registerUser }));
vi.mock("@/services/auth/sessions", () => ({
  createSession: mocks.createSession,
  setSessionCookie: mocks.setSessionCookie,
}));
vi.mock("@/services/auth/rate-limit", () => ({
  consumeAuthAttempt: mocks.consumeAuthAttempt,
  getAuthClientIp: () => "127.0.0.1",
}));
vi.mock("@/services/auth/email-verification", () => ({
  requestEmailVerification: mocks.requestEmailVerification,
}));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = { username: "ana", email: "ana@example.com", password: "unaClaveLarga1", acceptTerms: true, locale: "es" };

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthAttempt.mockReturnValue(true);
    mocks.registerUser.mockResolvedValue({ id: "u1", username: "ana", email: "ana@example.com", displayName: null });
    mocks.createSession.mockResolvedValue({ token: "t", remember: true });
    mocks.requestEmailVerification.mockResolvedValue(undefined);
  });

  it("con la casilla aceptada crea la cuenta y registra la aceptación por casilla", async () => {
    const response = await POST(request(valid));

    expect(response.status).toBe(201);
    expect(mocks.registerUser).toHaveBeenCalledTimes(1);
    expect(mocks.registerUser).toHaveBeenCalledWith(expect.objectContaining({ username: "ana" }), "checkbox");
  });

  it.each([
    ["sin el campo", { ...valid, acceptTerms: undefined }],
    ["con false", { ...valid, acceptTerms: false }],
    ["con un texto", { ...valid, acceptTerms: "true" }],
  ])("%s rechaza el alta con 400 y no crea nada", async (_name, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.registerUser).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
