import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getTargetMarks: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/catalog/target-marks", () => ({ getTargetMarks: mocks.getTargetMarks }));

const { GET } = await import("./route");

const ID = "00000000-0000-4000-8000-0000000000aa";
const call = (query: string) => GET(new NextRequest(`http://localhost/api/me/marks?${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
});

describe("GET /api/me/marks", () => {
  it("devuelve las marcas del usuario sin caché", async () => {
    const marks = { favorite: true, pending: false, stars: 4, detailedScore: null };
    mocks.getTargetMarks.mockResolvedValue(marks);
    const res = await call(`type=release-group&id=${ID}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual(marks);
    expect(mocks.getTargetMarks).toHaveBeenCalledWith("u1", "release-group", ID);
  });

  it("una canción devuelve pending null", async () => {
    mocks.getTargetMarks.mockResolvedValue({ favorite: false, pending: null, stars: null, detailedScore: null });
    const res = await call(`type=recording&id=${ID}`);
    expect((await res.json()).pending).toBeNull();
  });

  it("con un type fuera de vocabulario responde 400 sin consultar", async () => {
    const res = await call(`type=playlist&id=${ID}`);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.getTargetMarks).not.toHaveBeenCalled();
  });

  it("con un id inválido responde 400 sin consultar", async () => {
    const res = await call("type=artist&id=no-es-uuid");
    expect(res.status).toBe(400);
    expect(mocks.getTargetMarks).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    const res = await call(`type=artist&id=${ID}`);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
  });

  it("con un objetivo inexistente responde 404", async () => {
    mocks.getTargetMarks.mockRejectedValue(new ApiError("INVALID_TARGET", 404, "El objetivo no existe"));
    const res = await call(`type=artist&id=${ID}`);
    expect(res.status).toBe(404);
  });
});
