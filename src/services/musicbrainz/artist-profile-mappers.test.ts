import { describe, expect, it } from "vitest";
import pinkFloyd from "./__fixtures__/pink-floyd-artist-with-relations.json";
import kuervos from "./__fixtures__/kuervos-del-sur-artist-with-relations.json";
import monLaferte from "./__fixtures__/mon-laferte-artist-with-relations.json";
import { curatedArtistLinks, mapArtistProfileFacts, partialDate, wikidataIdOf } from "./artist-profile-mappers";
import type { MBArtistDetail } from "./types";

const PINK_FLOYD = pinkFloyd as MBArtistDetail;
const KUERVOS = kuervos as MBArtistDetail;
const MON_LAFERTE = monLaferte as MBArtistDetail;

function withUrls(...urls: [string, string, boolean?][]): MBArtistDetail {
  return {
    id: "x",
    name: "X",
    relations: urls.map(([type, resource, ended]) => ({ type, "target-type": "url", url: { resource }, ended })),
  };
}

describe("mapArtistProfileFacts", () => {
  it("grupo separado: país, lugar de inicio, 1965–2014 y la marca de terminado", () => {
    expect(mapArtistProfileFacts(PINK_FLOYD)).toMatchObject({
      country: "GB",
      beginAreaName: "London",
      lifeBegin: "1965",
      lifeEnd: "2014",
      lifeEnded: true,
      wikidataId: "Q2306",
    });
  });

  it("persona: fecha de nacimiento completa y país que no es el de nacimiento", () => {
    expect(mapArtistProfileFacts(MON_LAFERTE)).toMatchObject({
      country: "MX",
      beginAreaName: "Viña del Mar",
      lifeBegin: "1983-05-02",
      lifeEnd: null,
      lifeEnded: false,
      wikidataId: "Q2836528",
    });
  });

  it("banda chica: sin lugar de inicio y con enlace a Wikidata", () => {
    expect(mapArtistProfileFacts(KUERVOS)).toMatchObject({ country: "CL", beginAreaName: null, lifeBegin: "2003", wikidataId: "Q63565567" });
  });
});

describe("curatedArtistLinks", () => {
  it("con muchas relaciones guarda sitio oficial y una plataforma de streaming, sin redes ni bases de datos", () => {
    const links = curatedArtistLinks(PINK_FLOYD);
    expect(links.map((l) => l.kind)).toEqual(["official", "streaming"]);
    expect(links[0]).toMatchObject({ url: "https://www.pinkfloyd.com/", position: 0 });
    expect(links[1]!.url).toContain("open.spotify.com");
  });

  it("incluye Bandcamp entre el sitio oficial y el streaming", () => {
    const links = curatedArtistLinks(KUERVOS);
    expect(links.map((l) => [l.kind, l.position])).toEqual([
      ["bandcamp", 0],
      ["streaming", 1],
    ]);
    expect(links[0]!.url).toBe("https://kuervosdelsuroficial.bandcamp.com/");
  });

  it("sin Spotify elige Apple Music antes que Deezer", () => {
    const links = curatedArtistLinks(
      withUrls(["free streaming", "https://www.deezer.com/artist/1"], ["streaming", "https://music.apple.com/us/artist/2"]),
    );
    expect(links).toEqual([{ kind: "streaming", url: "https://music.apple.com/us/artist/2", position: 0 }]);
  });

  it("descarta relaciones terminadas y URLs inválidas", () => {
    const links = curatedArtistLinks(
      withUrls(["official homepage", "http://viejo.example/", true], ["free streaming", "no es una url"]),
    );
    expect(links).toEqual([]);
  });
});

describe("helpers", () => {
  it("partialDate acepta año, año y mes, y fecha completa", () => {
    expect(partialDate("1965")).toBe("1965");
    expect(partialDate("1983-05")).toBe("1983-05");
    expect(partialDate("1983-05-02")).toBe("1983-05-02");
    expect(partialDate("65")).toBeNull();
    expect(partialDate(null)).toBeNull();
  });

  it("wikidataIdOf lee el Q del recurso y null sin relación", () => {
    expect(wikidataIdOf(withUrls(["wikidata", "https://www.wikidata.org/wiki/Q2737642"]))).toBe("Q2737642");
    expect(wikidataIdOf(withUrls(["discogs", "https://www.discogs.com/artist/1"]))).toBeNull();
  });
});
