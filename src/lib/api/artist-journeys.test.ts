import { beforeEach, describe, expect, it, vi } from "vitest";
import { getArtistJourneyStatuses } from "./artist-journeys";

const a1 = "a1b2c3d4-0000-4000-8000-000000000001";
const a2 = "a1b2c3d4-0000-4000-8000-000000000002";

describe("cliente API de recorridos", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pide los estados por lote en una sola petición", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ journeyArtistIds: [a2] }), { status: 200 }));

    await expect(getArtistJourneyStatuses([a1, a2])).resolves.toEqual([a2]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0]![0] as string, "http://localhost");
    expect(url.pathname).toBe("/api/me/artist-journeys");
    expect(url.searchParams.get("artistIds")).toBe(`${a1},${a2}`);
  });

  it("rechaza una respuesta con forma inesperada", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ journeyArtistIds: "x" }), { status: 200 }));
    await expect(getArtistJourneyStatuses([a1])).rejects.toBeDefined();
  });
});
