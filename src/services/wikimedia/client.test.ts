import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMMONS_THUMB_WIDTH, WikimediaConfigError, wikimedia } from "./client";

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
  process.env.WIKIMEDIA_USER_AGENT = "music-platform-test (test@example.com)";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function lastUrl(): URL {
  return new URL(String(fetchMock.mock.calls.at(-1)![0]));
}

describe("cliente de Wikimedia", () => {
  it("falla cerrado sin User-Agent y no hace la request", async () => {
    delete process.env.WIKIMEDIA_USER_AGENT;
    await expect(wikimedia.getEntities(["Q2306"], ["claims"])).rejects.toBeInstanceOf(WikimediaConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getEntities pide wbgetentities en español e inglés, con maxlag y sitelinks filtrados", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ entities: {} }));
    await wikimedia.getEntities(["Q2306", "Q84"], ["claims", "descriptions", "sitelinks"]);

    const url = lastUrl();
    expect(url.origin + url.pathname).toBe("https://www.wikidata.org/w/api.php");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      action: "wbgetentities",
      ids: "Q2306|Q84",
      props: "claims|descriptions|sitelinks",
      languages: "es|en",
      sitefilter: "eswiki|enwiki",
      maxlag: "5",
      format: "json",
    });
    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("music-platform-test (test@example.com)");
  });

  it("getIntroExtract pide la introducción en texto plano a la Wikipedia del idioma", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ query: { pages: [] } }));
    await wikimedia.getIntroExtract("es", "Kuervos del Sur");

    const url = lastUrl();
    expect(url.hostname).toBe("es.wikipedia.org");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      inprop: "url",
      titles: "Kuervos del Sur",
    });
  });

  it("getImageInfo pide a Commons la miniatura y los metadatos de licencia", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ query: { pages: [] } }));
    await wikimedia.getImageInfo("Kuervos del Sur.jpg");

    const url = lastUrl();
    expect(url.hostname).toBe("commons.wikimedia.org");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      iiprop: "url|extmetadata",
      iiurlwidth: String(COMMONS_THUMB_WIDTH),
      titles: "File:Kuervos del Sur.jpg",
    });
    expect(url.searchParams.get("iiextmetadatafilter")).toContain("LicenseShortName");
  });

  it("reintenta ante maxlag y devuelve la respuesta siguiente", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { code: "maxlag", info: "atrasado" } }))
      .mockResolvedValueOnce(jsonResponse({ entities: { Q1: { id: "Q1" } } }));

    const promise = wikimedia.getEntities(["Q1"], ["labels"]);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ entities: { Q1: { id: "Q1" } } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("un error de la API que no es maxlag se propaga", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: "no-such-entity", info: "x" } }));
    await expect(wikimedia.getEntities(["Q0"], ["labels"])).rejects.toThrow("no-such-entity");
  });

  it("serializa las requests: la segunda sale después de la primera", async () => {
    const order: string[] = [];
    fetchMock.mockImplementation(async (input: string | URL) => {
      order.push(new URL(String(input)).hostname);
      return jsonResponse({ query: { pages: [] } });
    });
    await Promise.all([wikimedia.getIntroExtract("es", "A"), wikimedia.getIntroExtract("en", "B")]);
    expect(order).toEqual(["es.wikipedia.org", "en.wikipedia.org"]);
  });
});
