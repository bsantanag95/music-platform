import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  addWantedEntries: vi.fn(),
  listOwnWanted: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/collection/wanted", () => ({
  addWantedEntries: mocks.addWantedEntries,
  listOwnWanted: mocks.listOwnWanted,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const albumId = "00000000-0000-4000-8000-0000000000a1";
const entry = {
  id: "00000000-0000-4000-8000-0000000000e1",
  format: null,
  attributes: [],
  note: null,
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  album: { id: albumId, title: "DSOTM", coverThumbUrl: null, artistId: null, artistName: null },
};

type ReqInit = { method?: string; headers?: Record<string, string>; body?: string };
function req(url: string, init?: ReqInit) {
  return new NextRequest(`http://localhost${url}`, init);
}

describe("POST /api/me/collection/wanted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea una variante deseada con 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addWantedEntries.mockResolvedValue([entry]);
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: [{}] }),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ entries: [entry] });
    expect(mocks.addWantedEntries).toHaveBeenCalledWith(user.id, albumId, [{}]);
  });

  it("crea varias variantes en una sola operación", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addWantedEntries.mockResolvedValue([entry, entry]);
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          releaseGroupId: albumId,
          entries: [
            { format: "vinyl", attributes: ["deluxe-edition"] },
            { format: "cd", attributes: ["remaster"] },
          ],
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.addWantedEntries).toHaveBeenCalledWith(user.id, albumId, [
      { format: "vinyl", attributes: ["deluxe-edition"] },
      { format: "cd", attributes: ["remaster"] },
    ]);
  });

  it("rechaza un lote vacío con VALIDATION_ERROR", async () => {
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: [] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.addWantedEntries).not.toHaveBeenCalled();
  });

  it("rechaza más de 10 variantes", async () => {
    const many = Array.from({ length: 11 }, () => ({}));
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: many }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.addWantedEntries).not.toHaveBeenCalled();
  });

  it("rechaza un atributo fuera del vocabulario", async () => {
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: [{ attributes: ["shiny"] }] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.addWantedEntries).not.toHaveBeenCalled();
  });

  it("propaga ALBUM_NOT_FOUND del servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addWantedEntries.mockRejectedValue(new ApiError("ALBUM_NOT_FOUND", 404, "no existe"));
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: [{}] }),
      }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "ALBUM_NOT_FOUND" });
  });

  it("sin sesión devuelve 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const res = await POST(
      req("/api/me/collection/wanted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, entries: [{}] }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/me/collection/wanted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista la wishlist propia con búsqueda y orden", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listOwnWanted.mockResolvedValue({ entries: [entry], page: 1, pageSize: 20, hasNext: false });
    const res = await GET(req("/api/me/collection/wanted?q=moon&sort=alpha"));
    expect(res.status).toBe(200);
    expect(mocks.listOwnWanted).toHaveBeenCalledWith(user.id, 1, 20, { q: "moon", sort: "alpha" });
  });

  it("rechaza una paginación inválida con VALIDATION_ERROR", async () => {
    const res = await GET(req("/api/me/collection/wanted?page=0"));
    expect(res.status).toBe(400);
    expect(mocks.listOwnWanted).not.toHaveBeenCalled();
  });

  it("rechaza un orden inválido", async () => {
    const res = await GET(req("/api/me/collection/wanted?sort=cheapest"));
    expect(res.status).toBe(400);
    expect(mocks.listOwnWanted).not.toHaveBeenCalled();
  });
});
