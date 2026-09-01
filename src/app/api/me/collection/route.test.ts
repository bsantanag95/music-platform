import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  addEntry: vi.fn(),
  listOwnCollection: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/collection/collection", () => ({
  addEntry: mocks.addEntry,
  listOwnCollection: mocks.listOwnCollection,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const albumId = "00000000-0000-4000-8000-0000000000a1";
const entry = {
  id: "00000000-0000-4000-8000-0000000000e1",
  format: "vinyl",
  attributes: ["limited-edition"],
  note: null,
  audience: "followers",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  album: { id: albumId, title: "DSOTM", coverThumbUrl: null, artistId: null, artistName: null },
};

type ReqInit = { method?: string; headers?: Record<string, string>; body?: string };
function req(url: string, init?: ReqInit) {
  return new NextRequest(`http://localhost${url}`, init);
}

describe("POST /api/me/collection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea una entrada con 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addEntry.mockResolvedValue(entry);
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "vinyl", attributes: ["limited-edition"] }),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ entry });
    expect(mocks.addEntry).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ releaseGroupId: albumId, format: "vinyl" }),
    );
  });

  it("rechaza un formato inválido con VALIDATION_ERROR", async () => {
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "8-track" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.addEntry).not.toHaveBeenCalled();
  });

  it("rechaza un atributo fuera del vocabulario con VALIDATION_ERROR", async () => {
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "cd", attributes: ["shiny"] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.addEntry).not.toHaveBeenCalled();
  });

  it("rechaza una nota de más de 140 caracteres", async () => {
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "cd", note: "x".repeat(141) }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("propaga ALBUM_NOT_FOUND del servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addEntry.mockRejectedValue(new ApiError("ALBUM_NOT_FOUND", 404, "no existe"));
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "cd" }),
      }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "ALBUM_NOT_FOUND" });
  });

  it("sin sesión devuelve 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const res = await POST(
      req("/api/me/collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ releaseGroupId: albumId, format: "cd" }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/me/collection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista la colección propia con filtros", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listOwnCollection.mockResolvedValue({ entries: [entry], page: 1, pageSize: 20, hasNext: false });
    const res = await GET(req("/api/me/collection?format=vinyl&attribute=limited-edition"));
    expect(res.status).toBe(200);
    expect(mocks.listOwnCollection).toHaveBeenCalledWith(user.id, 1, 20, {
      format: "vinyl",
      attribute: "limited-edition",
    });
  });

  it("rechaza una paginación inválida con VALIDATION_ERROR", async () => {
    const res = await GET(req("/api/me/collection?page=0"));
    expect(res.status).toBe(400);
    expect(mocks.listOwnCollection).not.toHaveBeenCalled();
  });

  it("rechaza un filtro de formato inválido", async () => {
    const res = await GET(req("/api/me/collection?format=betamax"));
    expect(res.status).toBe(400);
    expect(mocks.listOwnCollection).not.toHaveBeenCalled();
  });
});
