import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListenBrainzConfigError, POPULARITY_BATCH_SIZE, listenbrainz } from "./client";

// Cliente real contra un fetch mockeado: nunca sale a internet. El reloj se adelanta con
// Date.now mockeado para que la cola no duerma de verdad.
const fetchMock = vi.fn();
const REAL_NOW = Date.now();
let nowOffsetMs = 0;

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body, headers: new Headers() } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Date, "now").mockImplementation(() => REAL_NOW + nowOffsetMs);
  fetchMock.mockReset();
  nowOffsetMs += 60_000;
  process.env.LISTENBRAINZ_USER_AGENT = "music-platform-test (test@example.com)";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cliente de ListenBrainz", () => {
  it("falla cerrado sin User-Agent y no hace la request", async () => {
    delete process.env.LISTENBRAINZ_USER_AGENT;
    await expect(
      listenbrainz.freshReleases({ pivot: "2026-10-06", days: 30, past: true, future: false }),
    ).rejects.toBeInstanceOf(ListenBrainzConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("freshReleases pide el feed con la fecha pivote y acota los días a 90", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ payload: { releases: [{ release_group_mbid: "x" }] } }));
    const rows = await listenbrainz.freshReleases({ pivot: "2026-10-06", days: 120, past: false, future: true });

    const [url, init] = fetchMock.mock.calls.at(-1)!;
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe("https://api.listenbrainz.org/1/explore/fresh-releases/");
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({
      release_date: "2026-10-06",
      days: "90",
      past: "false",
      future: "true",
    });
    expect(init.method).toBe("GET");
    expect(init.headers["User-Agent"]).toBe("music-platform-test (test@example.com)");
    expect(rows).toHaveLength(1);
  });

  it("artistPopularity deduplica y consulta por lotes con POST", async () => {
    fetchMock.mockImplementation(async (_url: unknown, init: { body: string }) => {
      const { artist_mbids } = JSON.parse(init.body) as { artist_mbids: string[] };
      return jsonResponse(artist_mbids.map((m) => ({ artist_mbid: m, total_listen_count: 1, total_user_count: 1 })));
    });
    const mbids = Array.from({ length: POPULARITY_BATCH_SIZE + 3 }, (_, i) => `a-${i}`);
    const result = await listenbrainz.artistPopularity([...mbids, "a-0", "a-1"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![1].method).toBe("POST");
    expect(new URL(String(fetchMock.mock.calls[0]![0])).pathname).toBe("/1/popularity/artist");
    expect(result).toHaveLength(POPULARITY_BATCH_SIZE + 3);
  });

  it("un error HTTP no reintentable se propaga", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    await expect(
      listenbrainz.freshReleases({ pivot: "2026-10-06", days: 30, past: true, future: false }),
    ).rejects.toThrow(/ListenBrainz respondió 500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
