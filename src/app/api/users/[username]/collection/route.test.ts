import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listProfileCollection: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/collection/collection", () => ({
  listProfileCollection: mocks.listProfileCollection,
}));

const params = (username: string) => ({ params: Promise.resolve({ username }) });
const req = (url: string) => new NextRequest(`http://localhost${url}`);

describe("GET /api/users/[username]/collection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve la colección visible de un perfil", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.listProfileCollection.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    const res = await GET(req("/api/users/nick/collection"), params("nick"));
    expect(res.status).toBe(200);
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("nick", "viewer", 1, 20, {});
  });

  it("visitante anónimo pasa viewerId null", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listProfileCollection.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    await GET(req("/api/users/nick/collection"), params("nick"));
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("nick", null, 1, 20, {});
  });

  it("propaga búsqueda y orden al servicio", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listProfileCollection.mockResolvedValue({
      entries: [],
      page: 1,
      pageSize: 20,
      hasNext: false,
      counts: { vinyl: 0, cd: 0, cassette: 0, other: 0 },
    });
    await GET(req("/api/users/nick/collection?q=moon&sort=artist&group=format"), params("nick"));
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("nick", null, 1, 20, {
      q: "moon",
      sort: "artist",
      group: "format",
    });
  });

  it("username inexistente propaga 404 USER_NOT_FOUND", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listProfileCollection.mockRejectedValue(new ApiError("USER_NOT_FOUND", 404, "x"));
    const res = await GET(req("/api/users/ghost/collection"), params("ghost"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("paginación inválida devuelve 400 sin consultar", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    const res = await GET(req("/api/users/nick/collection?pageSize=999"), params("nick"));
    expect(res.status).toBe(400);
    expect(mocks.listProfileCollection).not.toHaveBeenCalled();
  });

  it("filtro de atributo inválido devuelve 400", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    const res = await GET(req("/api/users/nick/collection?attribute=nope"), params("nick"));
    expect(res.status).toBe(400);
    expect(mocks.listProfileCollection).not.toHaveBeenCalled();
  });
});
