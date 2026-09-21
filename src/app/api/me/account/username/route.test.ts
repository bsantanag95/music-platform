import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  changeUsername: vi.fn(),
  checkUsernameAvailability: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/auth/username", () => ({
  changeUsername: mocks.changeUsername,
  checkUsernameAvailability: mocks.checkUsernameAvailability,
}));

import { PUT } from "./route";
import { GET } from "./availability/route";

const user = { id: "u1" };

function put(body: unknown) {
  return new NextRequest("http://localhost/api/me/account/username", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.requireUser.mockResolvedValue(user);
});

describe("PUT /api/me/account/username", () => {
  it("cambia el usuario y devuelve cuándo se puede volver a cambiar", async () => {
    const nextChangeAt = new Date("2026-10-21T12:00:00Z");
    mocks.changeUsername.mockResolvedValue({ username: "besan_music", nextChangeAt });

    const res = await PUT(put({ username: " besan_music " }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ username: "besan_music", nextChangeAt: "2026-10-21T12:00:00.000Z" });
    expect(mocks.changeUsername).toHaveBeenCalledWith("u1", "besan_music");
  });

  it("rechaza un cuerpo inválido", async () => {
    const res = await PUT(put({}));
    expect(res.status).toBe(400);
    expect(mocks.changeUsername).not.toHaveBeenCalled();
  });

  it.each([
    ["USERNAME_TAKEN", 409],
    ["USERNAME_CHANGE_COOLDOWN", 409],
    ["VALIDATION_ERROR", 400],
  ] as const)("propaga el código %s del servicio", async (code, status) => {
    mocks.changeUsername.mockRejectedValue(new ApiError(code, status, "x"));
    const res = await PUT(put({ username: "otro" }));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await PUT(put({ username: "otro" }))).status).toBe(401);
  });
});

describe("GET /api/me/account/username/availability", () => {
  const get = (q?: string) =>
    GET(new NextRequest(`http://localhost/api/me/account/username/availability${q === undefined ? "" : `?q=${q}`}`));

  it("devuelve la disponibilidad del usuario consultado", async () => {
    mocks.checkUsernameAvailability.mockResolvedValue({ valid: true, available: true, reason: null });
    const res = await get("nuevo_user");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, available: true, reason: null });
    expect(mocks.checkUsernameAvailability).toHaveBeenCalledWith("u1", "nuevo_user");
  });

  it("rechaza una consulta vacía", async () => {
    expect((await get()).status).toBe(400);
    expect((await get("%20")).status).toBe(400);
  });

  it("limita las consultas por usuario", async () => {
    mocks.checkUsernameAvailability.mockResolvedValue({ valid: true, available: true, reason: null });
    for (let call = 0; call < 120; call++) expect((await get("abc")).status).toBe(200);
    const res = await get("abc");
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("RATE_LIMITED");
  });
});
