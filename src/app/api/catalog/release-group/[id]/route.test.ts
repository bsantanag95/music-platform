import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as albumDetail from "@/services/catalog/album-detail";
import type { AlbumDetailResult } from "@/services/catalog/album-detail";

vi.mock("@/services/catalog/album-detail", () => ({
  getAlbumDetail: vi.fn(),
}));

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/catalog/release-group/${id}`);
}

describe("GET /api/catalog/release-group/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 404 con ALBUM_NOT_FOUND cuando el álbum no existe", async () => {
    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue({ kind: "not_found" });

    const response = await GET(makeRequest("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("ALBUM_NOT_FOUND");
  });

  it("devuelve 404 con NO_EDITIONS_FOUND cuando no hay ediciones", async () => {
    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue({ kind: "no_editions" });

    const response = await GET(makeRequest("album-no-editions"), {
      params: Promise.resolve({ id: "album-no-editions" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NO_EDITIONS_FOUND");
  });

  it("devuelve el detalle completo cuando el álbum existe", async () => {
    const mockDetail: AlbumDetailResult = {
      kind: "ok",
      detail: {
        releaseGroup: {
          id: "rg-1",
          mbid: "mbid-rg-1",
          title: "The Dark Side of the Moon",
          category: "studio",
          createdAt: new Date(),
        },
        release: {
          id: "r-1",
          mbid: "mbid-r-1",
          releaseGroupId: "rg-1",
          editionLabel: "original",
          releaseDate: "1973-03-01",
          coverThumbUrl: "https://coverartarchive.org/release-group/mbid-rg-1/front-250",
        },
        cover: "https://coverartarchive.org/release-group/mbid-rg-1/front-250",
        tracks: [
          {
            recordingId: "rec-1",
            discNumber: 1,
            position: 1,
            title: "Speak to Me",
            durationSec: 90,
            credits: [],
          },
        ],
        primaryArtist: { id: "a1", name: "Pink Floyd" },
      },
    };

    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue(mockDetail);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.release).toBeDefined();
    expect(body.release.id).toBe("r-1");
    expect(body.cover).toBe("https://coverartarchive.org/release-group/mbid-rg-1/front-250");
    expect(body.tracks).toHaveLength(1);
    expect(body.tracks[0].recordingId).toBe("rec-1");
    expect(body.tracks[0].title).toBe("Speak to Me");
  });

  it("conserva el shape público del endpoint (release, cover, tracks)", async () => {
    const mockDetail: AlbumDetailResult = {
      kind: "ok",
      detail: {
        releaseGroup: {
          id: "rg-1",
          mbid: "mbid-rg-1",
          title: "Album",
          category: "studio",
          createdAt: new Date(),
        },
        release: {
          id: "r-1",
          mbid: "mbid-r-1",
          releaseGroupId: "rg-1",
          editionLabel: "original",
          releaseDate: null,
          coverThumbUrl: null,
        },
        cover: null,
        tracks: [],
        primaryArtist: null,
      },
    };

    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue(mockDetail);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    const body = await response.json();

    expect(body).toHaveProperty("release");
    expect(body).toHaveProperty("cover");
    expect(body).toHaveProperty("tracks");
    expect(body).not.toHaveProperty("releaseGroup");
  });

  it("no expone el artista principal del read-model en la respuesta REST", async () => {
    const mockDetail: AlbumDetailResult = {
      kind: "ok",
      detail: {
        releaseGroup: {
          id: "rg-1",
          mbid: "mbid-rg-1",
          title: "Album",
          category: "studio",
          createdAt: new Date(),
        },
        release: {
          id: "r-1",
          mbid: "mbid-r-1",
          releaseGroupId: "rg-1",
          editionLabel: "original",
          releaseDate: null,
          coverThumbUrl: null,
        },
        cover: null,
        tracks: [],
        primaryArtist: { id: "a1", name: "Pink Floyd" },
      },
    };

    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue(mockDetail);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    const body = await response.json();
    expect(body).not.toHaveProperty("primaryArtist");
  });

  it("mantiene null en releaseDate cuando no hay fecha exacta, sin inventar una fecha", async () => {
    const mockDetail: AlbumDetailResult = {
      kind: "ok",
      detail: {
        releaseGroup: {
          id: "rg-1",
          mbid: "mbid-rg-1",
          title: "Icon",
          category: "studio",
          createdAt: new Date(),
        },
        release: {
          id: "r-1",
          mbid: "mbid-r-1",
          releaseGroupId: "rg-1",
          editionLabel: "original",
          releaseDate: null,
          coverThumbUrl: null,
        },
        cover: null,
        tracks: [],
        primaryArtist: null,
      },
    };

    vi.mocked(albumDetail.getAlbumDetail).mockResolvedValue(mockDetail);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    const body = await response.json();
    expect(body.release.releaseDate).toBeNull();
  });
});
