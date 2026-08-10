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

  it("acepta la respuesta de search que todavía no incluye memberships", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups }), { status: 200 }),
    ));

    await expect(searchCatalog("Pink Floyd")).resolves.toMatchObject({ artist, releaseGroups });
  });

  it("rechaza un perfil sin memberships", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ artist, releaseGroups }), { status: 200 }),
    ));

    await expect(getArtistById(artist.id)).rejects.toThrow();
  });
});
