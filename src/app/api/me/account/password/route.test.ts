import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  changePassword: vi.fn(),
  createPassword: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/services/auth/password-change", () => ({
  changePassword: mocks.changePassword,
  createPassword: mocks.createPassword,
}));

import { POST, PUT } from "./route";

const current = { sessionId: "s1", user: { id: "u1" } };

function req(method: "PUT" | "POST", body: unknown) {
  return new NextRequest("http://localhost/api/me/account/password", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue(current);
  mocks.changePassword.mockResolvedValue(undefined);
  mocks.createPassword.mockResolvedValue(undefined);
});

describe("PUT /api/me/account/password", () => {
  it("cambia la contraseña con el cierre de sesiones pedido", async () => {
    const res = await PUT(
      req("PUT", { currentPassword: "actual-123", newPassword: "nueva-456", revokeOtherSessions: true, locale: "en" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.changePassword).toHaveBeenCalledWith(current, {
      currentPassword: "actual-123",
      newPassword: "nueva-456",
      revokeOtherSessions: true,
      locale: "en",
    });
  });

  it("por defecto no cierra las otras sesiones", async () => {
    await PUT(req("PUT", { currentPassword: "actual-123", newPassword: "nueva-456" }));
    expect(mocks.changePassword).toHaveBeenCalledWith(
      current,
      expect.objectContaining({ revokeOtherSessions: false, locale: "es" }),
    );
  });

  it("rechaza una contraseña nueva de menos de 8 caracteres", async () => {
    const res = await PUT(req("PUT", { currentPassword: "actual-123", newPassword: "corta" }));
    expect(res.status).toBe(400);
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña nueva de más de 128 caracteres", async () => {
    const res = await PUT(req("PUT", { currentPassword: "actual-123", newPassword: "a".repeat(129) }));
    expect(res.status).toBe(400);
  });

  it.each([
    ["INVALID_CREDENTIALS", 403],
    ["PASSWORD_REUSED", 400],
    ["RATE_LIMITED", 429],
  ] as const)("propaga %s", async (code, status) => {
    mocks.changePassword.mockRejectedValue(new ApiError(code, status, "x"));
    const res = await PUT(req("PUT", { currentPassword: "actual-123", newPassword: "nueva-456" }));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
  });

  it("exige sesión", async () => {
    mocks.requireSession.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await PUT(req("PUT", { currentPassword: "a", newPassword: "nueva-456" }))).status).toBe(401);
  });
});

describe("POST /api/me/account/password", () => {
  it("crea la contraseña", async () => {
    const res = await POST(req("POST", { newPassword: "nueva-456" }));
    expect(res.status).toBe(200);
    expect(mocks.createPassword).toHaveBeenCalledWith(current, { newPassword: "nueva-456", locale: "es" });
  });

  it("rechaza una contraseña demasiado corta", async () => {
    expect((await POST(req("POST", { newPassword: "corta" }))).status).toBe(400);
    expect(mocks.createPassword).not.toHaveBeenCalled();
  });

  it("propaga REAUTH_REQUIRED", async () => {
    mocks.createPassword.mockRejectedValue(new ApiError("REAUTH_REQUIRED", 403, "x"));
    const res = await POST(req("POST", { newPassword: "nueva-456" }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("REAUTH_REQUIRED");
  });
});
