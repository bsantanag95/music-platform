import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as artistService from "@/services/catalog/ingest-artist";
import * as discographyService from "@/services/catalog/ingest-discography";

vi.mock("@/services/catalog/ingest-artist", () => ({
  getArtistById: vi.fn(),
  getArtistMemberships: vi.fn(),
  ensureArtistMemberships: vi.fn(),
}));

vi.mock("@/services/catalog/ingest-discography", () => ({
  findOrIngestDiscography: vi.fn(),
}));

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/catalog/artist/${id}`);
}

describe("GET /api/catalog/artist/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conserva memberships en la respuesta del perfil", async () => {
    const artist = {
      id: "11111111-1111-4111-8111-111111111111",
      mbid: null,
      type: "group" as const,
      name: "Pink Floyd",
      bio: null,
      photoUrl: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      discographySyncedAt: null,
      membershipsSyncedAt: null,
    };
    const memberships = [{
      artistId: "22222222-2222-4222-8222-222222222222",
      name: "Roger Waters",
      type: "person",
      role: "bass",
      joinedOn: "1965",
      leftOn: null,
    }];
    vi.mocked(artistService.getArtistById).mockResolvedValue(artist);
    vi.mocked(artistService.ensureArtistMemberships).mockResolvedValue();
    vi.mocked(artistService.getArtistMemberships).mockResolvedValue(memberships);
    vi.mocked(discographyService.findOrIngestDiscography).mockResolvedValue([]);

    const response = await GET(makeRequest(artist.id), { params: Promise.resolve({ id: artist.id }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.artist).toMatchObject({ id: artist.id, name: artist.name });
    expect(body.releaseGroups).toEqual([]);
    expect(body.memberships).toEqual(memberships);
  });
});
