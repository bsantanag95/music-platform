import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  markSeen: vi.fn().mockResolvedValue(undefined),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/read", () => ({ markSeen: mocks.markSeen }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

function request(query = "") {
  return new NextRequest(`http://localhost/api/me/notifications/seen${query}`);
}

beforeEach(() => vi.clearAllMocks());

describe("PUT /api/me/notifications/seen", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await PUT(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });

  it("marca la bandeja propia como vista", async () => {
    mocks.requireUser.mockResolvedValue(user);

    const response = await PUT(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.markSeen).toHaveBeenCalledWith(user.id, "for_you");
  });

  it("con tab=releases mueve solo la marca de Novedades", async () => {
    mocks.requireUser.mockResolvedValue(user);

    const response = await PUT(request("?tab=releases"));

    expect(response.status).toBe(200);
    expect(mocks.markSeen).toHaveBeenCalledWith(user.id, "releases");
  });

  it("rechaza una pestaña desconocida sin tocar la marca", async () => {
    const response = await PUT(request("?tab=otra"));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });
});
