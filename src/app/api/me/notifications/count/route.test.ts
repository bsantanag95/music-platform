import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  countUnseen: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/read", () => ({ countUnseen: mocks.countUnseen }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/me/notifications/count", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET(new NextRequest("http://localhost/api/me/notifications/count"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.countUnseen).not.toHaveBeenCalled();
  });

  it("cuenta las entradas del usuario de la sesión", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.countUnseen.mockResolvedValue(9);

    const response = await GET(new NextRequest("http://localhost/api/me/notifications/count"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 9 });
    expect(mocks.countUnseen).toHaveBeenCalledWith(user.id, undefined);
  });

  it("pasa la zona horaria de tz", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.countUnseen.mockResolvedValue(0);

    await GET(
      new NextRequest("http://localhost/api/me/notifications/count?tz=America%2FSantiago"),
    );

    expect(mocks.countUnseen).toHaveBeenCalledWith(user.id, "America/Santiago");
  });

  it("rechaza una zona horaria desconocida", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/notifications/count?tz=Marte%2FBase"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.countUnseen).not.toHaveBeenCalled();
  });
});
