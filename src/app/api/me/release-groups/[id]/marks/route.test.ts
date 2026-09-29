import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getReleaseGroupMarks: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/catalog/release-group-marks", () => ({ getReleaseGroupMarks: mocks.getReleaseGroupMarks }));

const { GET } = await import("./route");

const ID = "00000000-0000-4000-8000-0000000000aa";
const call = (id: string) => GET(new NextRequest(`http://localhost/api/me/release-groups/${id}/marks`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
});

describe("GET /api/me/release-groups/{id}/marks", () => {
  it("devuelve las marcas del usuario sin caché", async () => {
    const marks = { listened: true, stars: 4, detailedScore: null, favorite: false, pending: false, lists: [] };
    mocks.getReleaseGroupMarks.mockResolvedValue(marks);
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual(marks);
    expect(mocks.getReleaseGroupMarks).toHaveBeenCalledWith("u1", ID);
  });

  it("sin sesión responde 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    const res = await call(ID);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("AUTH_REQUIRED");
  });

  it("con un id inválido responde 400 sin consultar", async () => {
    const res = await call("no-es-uuid");
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.getReleaseGroupMarks).not.toHaveBeenCalled();
  });

  it("con un disco inexistente responde 404 ALBUM_NOT_FOUND", async () => {
    mocks.getReleaseGroupMarks.mockRejectedValue(new ApiError("ALBUM_NOT_FOUND", 404, "Álbum no encontrado"));
    const res = await call(ID);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("ALBUM_NOT_FOUND");
  });
});
