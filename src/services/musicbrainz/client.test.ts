import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { musicbrainz, clearMusicBrainzSearchCacheForTests } from "./client";

// El cliente real (cola de rate limit + caché de búsquedas) contra un fetch
// mockeado — nunca sale a internet. En vez de fake timers se corre el reloj
// con Date.now mockeado: así la cola de 1.1 s nunca duerme de verdad.
const fetchMock = vi.fn();

const REAL_NOW = Date.now();
let nowOffsetMs = 0;

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Date, "now").mockImplementation(() => REAL_NOW + nowOffsetMs);
  fetchMock.mockReset();
  // El reloj nunca retrocede entre tests: la cola ve elapsed grande y no duerme.
  nowOffsetMs += 5 * 60_000;
  process.env.MUSICBRAINZ_USER_AGENT = "music-platform-test (test@example.com)";
  clearMusicBrainzSearchCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Avanza el reloj más que el intervalo de la cola para que el request no duerma. */
function tickPastQueue() {
  nowOffsetMs += 1200;
}

describe("caché de respuestas de búsqueda (client.ts)", () => {
  it("la misma consulta repetida hace un solo request a MusicBrainz", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ artists: [] }));

    const primera = await musicbrainz.searchArtist("poison");
    tickPastQueue();
    const segunda = await musicbrainz.searchArtist("poison");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(segunda).toBe(primera);
  });

  it("requests concurrentes idénticos comparten el mismo request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ artists: [] }));

    const [a, b] = await Promise.all([
      musicbrainz.searchArtist("sabrina"),
      musicbrainz.searchArtist("sabrina"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("vencida la TTL, la misma consulta vuelve a MusicBrainz", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ artists: [] }));

    await musicbrainz.searchArtist("poison");
    nowOffsetMs += 10 * 60_000 + 1200;
    await musicbrainz.searchArtist("poison");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("una búsqueda fallida no queda cacheada: la siguiente reintenta", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(musicbrainz.searchArtist("falla")).rejects.toThrow();
    tickPastQueue();
    await expect(musicbrainz.searchArtist("falla")).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("searchReleaseGroup cachea por su propia clave", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ "release-groups": [] }));

    await musicbrainz.searchReleaseGroup("toxicity");
    await musicbrainz.searchReleaseGroup("toxicity");
    tickPastQueue();
    await musicbrainz.searchArtist("toxicity");

    // release-group una vez sola; artist es otra clave y suma su request.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("los get de entidad no se cachean (la ingesta siempre es fresca)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "mb-1", name: "x" }));

    await musicbrainz.getArtist("mb-1");
    tickPastQueue();
    await musicbrainz.getArtist("mb-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("búsqueda de grabaciones y apariciones (recording)", () => {
  it("searchRecording pide /recording con query, limit e inc=artist-credits", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ recordings: [] }));

    await musicbrainz.searchRecording("stairway to heaven");

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/ws/2/recording");
    expect(url.searchParams.get("query")).toBe("stairway to heaven");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("inc")).toBe("artist-credits");
  });

  it("searchRecording cachea por su propia clave", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ recordings: [] }));

    await musicbrainz.searchRecording("poison");
    await musicbrainz.searchRecording("poison");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("browseReleasesByRecording pide /release con recording, limit 100 e inc=release-groups", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ releases: [] }));

    await musicbrainz.browseReleasesByRecording("rec-mbid-1");

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/ws/2/release");
    expect(url.searchParams.get("recording")).toBe("rec-mbid-1");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("inc")).toBe("release-groups");
  });

  it("browseReleasesByRecording se cachea por mbid (contexto de búsqueda, no ingesta)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ releases: [] }));

    await musicbrainz.browseReleasesByRecording("rec-mbid-1");
    await musicbrainz.browseReleasesByRecording("rec-mbid-1");
    tickPastQueue();
    await musicbrainz.browseReleasesByRecording("rec-mbid-2");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
