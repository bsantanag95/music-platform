import { describe, expect, it, vi, afterEach } from "vitest";
import { getArtistById, searchCatalog } from "./catalog";

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

  const searchResult = {
    kind: "artist" as const,
    id: artist.id,
    mbid: "3b7f8b40-8e0c-4f57-9a58-9d0f9d4b7f01",
    name: "Poison",
    subtitle: "glam metal band",
    artistType: "group" as const,
    category: null,
    year: null,
    cached: true,
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

  it("acepta la lista de candidatos de search", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [searchResult] }), { status: 200 }),
    ));

    await expect(searchCatalog("Poison")).resolves.toEqual({ results: [searchResult] });
  });

  it("rechaza un search que todavía devuelve la forma vieja { artist, releaseGroups }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups }), { status: 200 }),
    ));

    await expect(searchCatalog("Pink Floyd")).rejects.toThrow();
  });

  it("rechaza un perfil sin memberships", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups }), { status: 200 }),
    ));

    await expect(getArtistById(artist.id)).rejects.toThrow();
  });
});
