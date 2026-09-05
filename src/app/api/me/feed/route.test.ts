import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  listFeed: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/feed/feed", () => ({
  listFeed: mocks.listFeed,
  FEED_KINDS: ["listen", "favorite", "list", "rating", "comment"],
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const feedEntry = {
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: "loved",
  audience: "followers",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: "00000000-0000-4000-8000-000000000001", title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
  author: { id: "00000000-0000-4000-8000-000000000002", username: "seguido", displayName: "Seguido" },
};

describe("feed API (GET /api/me/feed)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["page", "NaN"],
    ["page", "0"],
    ["pageSize", "0"],
    ["pageSize", "101"],
  ])("rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/me/feed?${parameter}=${value}`);
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listFeed).not.toHaveBeenCalled();
  });

  it("devuelve el feed paginado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listFeed.mockResolvedValue({ entries: [feedEntry], page: 1, pageSize: 20, hasNext: false });

    const response = await GET(new NextRequest("http://localhost/api/me/feed"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [feedEntry] });
    expect(mocks.listFeed).toHaveBeenCalledWith(user.id, 1, 20, {
      kind: undefined,
      authorId: undefined,
      q: undefined,
    });
  });

  it("devuelve entradas de rating y comentario tal como las arma el servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    const ratingEntry = {
      kind: "rating",
      id: "00000000-0000-4000-8000-000000000010",
      stars: "4.5",
      detailedScore: 90,
      createdAt: "2026-01-05T00:00:00.000Z",
      target: { type: "artist", id: "00000000-0000-4000-8000-000000000001", title: "Pink Floyd", coverThumbUrl: null },
      author: { id: "00000000-0000-4000-8000-000000000002", username: "seguido", displayName: "Seguido" },
    };
    const commentEntry = {
      kind: "comment",
      id: "00000000-0000-4000-8000-000000000011",
      body: "Un discazo",
      createdAt: "2026-01-06T00:00:00.000Z",
      target: { type: "artist", id: "00000000-0000-4000-8000-000000000001", title: "Pink Floyd", coverThumbUrl: null },
      author: { id: "00000000-0000-4000-8000-000000000002", username: "seguido", displayName: "Seguido" },
    };
    mocks.listFeed.mockResolvedValue({ entries: [commentEntry, ratingEntry], page: 1, pageSize: 20, hasNext: false });

    const response = await GET(new NextRequest("http://localhost/api/me/feed"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [commentEntry, ratingEntry] });
  });

  it("devuelve 401 AUTH_REQUIRED sin sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET(new NextRequest("http://localhost/api/me/feed"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  describe("filtros (add-feed-filters)", () => {
    it("rechaza un kind fuera del enum cerrado, sin llamar al servicio", async () => {
      const response = await GET(new NextRequest("http://localhost/api/me/feed?kind=not-a-kind"));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      expect(mocks.listFeed).not.toHaveBeenCalled();
    });

    it("acepta cada valor del enum de kind y lo pasa al servicio", async () => {
      mocks.requireUser.mockResolvedValue(user);
      mocks.listFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });

      for (const kind of ["listen", "favorite", "list", "rating", "comment"]) {
        mocks.listFeed.mockClear();
        await GET(new NextRequest(`http://localhost/api/me/feed?kind=${kind}`));
        expect(mocks.listFeed).toHaveBeenCalledWith(user.id, 1, 20, {
          kind,
          authorId: undefined,
          q: undefined,
        });
      }
    });

    it("pasa authorId y q recortado al servicio", async () => {
      mocks.requireUser.mockResolvedValue(user);
      mocks.listFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });

      await GET(
        new NextRequest(
          `http://localhost/api/me/feed?authorId=${encodeURIComponent("u2")}&q=${encodeURIComponent("  radiohead  ")}`,
        ),
      );

      expect(mocks.listFeed).toHaveBeenCalledWith(user.id, 1, 20, {
        kind: undefined,
        authorId: "u2",
        q: "radiohead",
      });
    });

    it("propaga el VALIDATION_ERROR del servicio (authorId fuera de los seguidos) como 400", async () => {
      mocks.requireUser.mockResolvedValue(user);
      mocks.listFeed.mockRejectedValue(
        new ApiError("VALIDATION_ERROR", 400, "El autor no pertenece a tus seguidos"),
      );

      const response = await GET(new NextRequest("http://localhost/api/me/feed?authorId=u9"));

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });
});
