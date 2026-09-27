import { describe, expect, it, vi, afterEach } from "vitest";
import { getArtistById, getSearchSuggestions, searchAlbums, searchArtists } from "./catalog";

describe("cliente del catálogo de artistas", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const artist = {
    id: "11111111-1111-4111-8111-111111111111",
    mbid: null,
    type: "group" as const,
    name: "Pink Floyd",
    bio: null,
    photoUrl: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    discographySyncedAt: null,
    membershipsSyncedAt: null,
  };

  const releaseGroups: never[] = [];

  const searchResponse = {
    type: "artist" as const,
    remoteFailed: false,
    results: [
      {
        kind: "artist" as const,
        id: artist.id,
        mbid: "3b7f8b40-8e0c-4f57-9a58-9d0f9d4b7f01",
        name: "Poison",
        disambiguation: "glam metal band",
        artistType: "group" as const,
        country: "US",
        cached: true,
        exact: true,
      },
    ],
  };

  it("conserva memberships al obtener el perfil de un artista", async () => {
    const memberships = [{
      artistId: "22222222-2222-4222-8222-222222222222",
      name: "Roger Waters",
      type: "person" as const,
      role: "bass",
      joinedOn: "1965",
      leftOn: null,
    }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups, memberships }), { status: 200 }),
    ));

    await expect(getArtistById(artist.id)).resolves.toMatchObject({ memberships });
  });

  it("busca un solo tipo y valida su payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(searchResponse), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchArtists("Poison", { artistType: "group" })).resolves.toEqual(searchResponse);
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/search?type=artist&q=Poison&artistType=group", undefined);
  });

  it("rechaza la forma vieja mezclada { results } sin tipo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    ));

    await expect(searchAlbums("Destroyer")).rejects.toThrow();
  });

  it("pide sugerencias locales con su señal de cancelación", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(getSearchSuggestions("user", "an", controller.signal)).resolves.toEqual({ suggestions: [] });
    expect(fetchMock).toHaveBeenCalledWith("/api/search/suggest?type=user&q=an", { signal: controller.signal });
  });

  it("rechaza un perfil sin memberships", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups }), { status: 200 }),
    ));

    await expect(getArtistById(artist.id)).rejects.toThrow();
  });
});
