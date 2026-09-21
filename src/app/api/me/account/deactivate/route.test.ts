import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  deactivateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/services/auth/account-lifecycle", () => ({
  deactivateAccount: mocks.deactivateAccount,
  deleteAccount: mocks.deleteAccount,
}));
vi.mock("@/services/auth/sessions", () => ({ clearSessionCookie: mocks.clearSessionCookie }));

import { POST as deactivate } from "./route";
import { DELETE as remove } from "../route";

const current = { sessionId: "s1", user: { id: "u1", username: "ana" } };

function req(method: string, url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue(current);
  mocks.deactivateAccount.mockResolvedValue(undefined);
  mocks.deleteAccount.mockResolvedValue(undefined);
});

describe("POST /api/me/account/deactivate", () => {
  it("desactiva con la contraseña y limpia la cookie de sesión", async () => {
    const res = await deactivate(req("POST", "/api/me/account/deactivate", { password: "secreta" }));
    expect(res.status).toBe(200);
    expect(mocks.deactivateAccount).toHaveBeenCalledWith(current, "secreta");
    expect(mocks.clearSessionCookie).toHaveBeenCalledWith(res);
  });

  it("una cuenta de Google desactiva sin contraseña (el factor es la sesión reciente)", async () => {
    await deactivate(req("POST", "/api/me/account/deactivate", {}));
    expect(mocks.deactivateAccount).toHaveBeenCalledWith(current, undefined);
  });

  it("sin cuerpo tampoco falla: la contraseña es opcional", async () => {
    const res = await deactivate(req("POST", "/api/me/account/deactivate"));
    expect(res.status).toBe(200);
  });

  it.each([
    ["INVALID_CREDENTIALS", 403],
    ["REAUTH_REQUIRED", 403],
    ["RATE_LIMITED", 429],
  ] as const)("propaga %s sin limpiar la cookie", async (errorCode, status) => {
    mocks.deactivateAccount.mockRejectedValue(new ApiError(errorCode, status, "x"));
    const res = await deactivate(req("POST", "/api/me/account/deactivate", { password: "x" }));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(errorCode);
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
  });

  it("exige sesión", async () => {
    mocks.requireSession.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await deactivate(req("POST", "/api/me/account/deactivate", {}))).status).toBe(401);
    expect(mocks.deactivateAccount).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/me/account", () => {
  it("elimina con el usuario de confirmación y la contraseña, y limpia la cookie", async () => {
    const res = await remove(req("DELETE", "/api/me/account", { username: " ana ", password: "secreta" }));
    expect(res.status).toBe(200);
    expect(mocks.deleteAccount).toHaveBeenCalledWith(current, { username: "ana", password: "secreta" });
    expect(mocks.clearSessionCookie).toHaveBeenCalledWith(res);
  });

  it("sin usuario de confirmación responde validación y no borra nada", async () => {
    const res = await remove(req("DELETE", "/api/me/account", { password: "secreta" }));
    expect(res.status).toBe(400);
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it("sin cuerpo responde validación", async () => {
    expect((await remove(req("DELETE", "/api/me/account"))).status).toBe(400);
  });

  it("una cuenta con historial de moderación responde 409 ACCOUNT_DELETION_BLOCKED y NO limpia la cookie", async () => {
    mocks.deleteAccount.mockRejectedValue(new ApiError("ACCOUNT_DELETION_BLOCKED", 409, "x"));
    const res = await remove(req("DELETE", "/api/me/account", { username: "ana" }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ACCOUNT_DELETION_BLOCKED");
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
  });

  it("exige sesión", async () => {
    mocks.requireSession.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await remove(req("DELETE", "/api/me/account", { username: "ana" }))).status).toBe(401);
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });
});
