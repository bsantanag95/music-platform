import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  deleteAllSessions: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/auth/sessions", () => ({
  deleteAllSessions: mocks.deleteAllSessions,
  clearSessionCookie: mocks.clearSessionCookie,
}));

import { DELETE } from "./route";

describe("DELETE /api/auth/revoke-all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 401 uniforme sin sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Se requiere una sesión activa", code: "AUTH_REQUIRED" });
    expect(mocks.deleteAllSessions).not.toHaveBeenCalled();
  });

  it("revoca todas las sesiones del usuario autenticado", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-id" });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.deleteAllSessions).toHaveBeenCalledWith("user-id");
    expect(mocks.clearSessionCookie).toHaveBeenCalledWith(response);
  });
});
