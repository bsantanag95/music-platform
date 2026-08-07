import { describe, it, expect, vi, afterEach } from "vitest";
import { coverThumbUrl, resolveCoverThumbUrl } from "./cover-art";

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
