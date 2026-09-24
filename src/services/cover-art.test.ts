import { describe, it, expect, vi, afterEach } from "vitest";
import { coverThumbUrl, fetchCoverThumb, resolveCoverThumbUrl } from "./cover-art";

const RG_MBID = "mbid-rg-1";
const EXPECTED_URL = `https://coverartarchive.org/release-group/${RG_MBID}/front-250`;

function stubFetchStatus(status: number) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ status })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("coverThumbUrl", () => {
  it("arma la URL de la miniatura del release-group", () => {
    expect(coverThumbUrl(RG_MBID)).toBe(EXPECTED_URL);
  });
});

describe("resolveCoverThumbUrl", () => {
  it("hace un HEAD con redirect manual y devuelve la URL ante un 2xx", async () => {
    const fetchMock = vi.fn(async () => ({ status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveCoverThumbUrl(RG_MBID)).toBe(EXPECTED_URL);

    const [input, init] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    expect(input).toBe(EXPECTED_URL);
    expect(init).toMatchObject({ method: "HEAD", redirect: "manual" });
  });

  it("trata los redirects (3xx) como carátula existente", async () => {
    stubFetchStatus(302);
    expect(await resolveCoverThumbUrl(RG_MBID)).toBe(EXPECTED_URL);
  });

  it("devuelve null ante un 404", async () => {
    stubFetchStatus(404);
    expect(await resolveCoverThumbUrl(RG_MBID)).toBeNull();
  });

  it("devuelve null ante un error de servidor (5xx)", async () => {
    stubFetchStatus(500);
    expect(await resolveCoverThumbUrl(RG_MBID)).toBeNull();
  });

  it("devuelve null si la red falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    expect(await resolveCoverThumbUrl(RG_MBID)).toBeNull();
  });

  it("devuelve null sin consultar la red cuando el mbid está vacío", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await resolveCoverThumbUrl("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchCoverThumb", () => {
  it("devuelve found con los bytes ante un 200, siguiendo redirecciones", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      arrayBuffer: async () => bytes.buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCoverThumb(RG_MBID);

    expect(result).toEqual({ status: "found", bytes: Buffer.from(bytes) });
    const [input, init] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    expect(input).toBe(EXPECTED_URL);
    expect(init).toMatchObject({ redirect: "follow" });
  });

  it("devuelve missing ante un 404", async () => {
    stubFetchStatus(404);
    expect(await fetchCoverThumb(RG_MBID)).toEqual({ status: "missing" });
  });

  it("devuelve transient ante un error de servidor (5xx)", async () => {
    stubFetchStatus(500);
    expect(await fetchCoverThumb(RG_MBID)).toEqual({ status: "transient" });
  });

  it("devuelve transient si la red falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    expect(await fetchCoverThumb(RG_MBID)).toEqual({ status: "transient" });
  });

  it("devuelve transient si el request se aborta por timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
    );
    expect(await fetchCoverThumb(RG_MBID)).toEqual({ status: "transient" });
  });

  it("devuelve missing sin consultar la red cuando el mbid está vacío", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchCoverThumb("")).toEqual({ status: "missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
