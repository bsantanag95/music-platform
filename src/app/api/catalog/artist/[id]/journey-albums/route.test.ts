import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ artistExists: vi.fn(), listArtistJourneyAlbums: vi.fn() }));
vi.mock("@/services/catalog/artist-journey-albums", () => ({
  artistExists: mocks.artistExists,
  listArtistJourneyAlbums: mocks.listArtistJourneyAlbums,
}));

const AID = "00000000-0000-4000-8000-0000000000a1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new NextRequest(`http://localhost/api/catalog/artist/${AID}/journey-albums`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.artistExists.mockResolvedValue(true);
  mocks.listArtistJourneyAlbums.mockResolvedValue([{ id: "rg1", title: "Animals" }]);
});

describe("GET /api/catalog/artist/[id]/journey-albums", () => {
  it("devuelve los discos propios del artista sin pedir sesión", async () => {
    const res = await GET(req(), ctx(AID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ albums: [{ id: "rg1", title: "Animals" }] });
    expect(mocks.listArtistJourneyAlbums).toHaveBeenCalledWith(AID);
  });

  it("404 con un id inválido, sin consultar la base", async () => {
    const res = await GET(req(), ctx("no-es-uuid"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("ARTIST_NOT_FOUND");
    expect(mocks.artistExists).not.toHaveBeenCalled();
  });

  it("404 si el artista no existe", async () => {
    mocks.artistExists.mockResolvedValue(false);
    const res = await GET(req(), ctx(AID));
    expect(res.status).toBe(404);
    expect(mocks.listArtistJourneyAlbums).not.toHaveBeenCalled();
  });
});
