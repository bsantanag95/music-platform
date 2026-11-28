// @vitest-environment node
import { describe, expect, it } from "vitest";
import { answeredIds, nameContainsQuery, pickArtistAnswer } from "./artist-answer";
import type { ArtistSearchResult } from "./types";

function artist(id: string, name: string, exact: boolean, discCount: number | null = null): ArtistSearchResult {
  return { kind: "artist", id, mbid: null, name, disambiguation: null, artistType: "group", country: null, cached: discCount !== null, exact, discCount };
}

// Muestras reales del 28 nov 2026 (design D1): orden del tipo tal como llegó.
const PINK = [
  artist("pink-jp", "PINK", true),
  artist("pink-de", "Pink", true),
  artist("pink-it", "Pink", true),
  artist("pf-2023", "Pink Floyd", false, 1),
  artist("pf", "Pink Floyd", false, 233),
  artist("lpd", "The Legendary Pink Dots", false, 175),
  artist("martini", "Pink Martini", false, 19),
  artist("bonnie", "BONNIE PINK", false, 55),
  artist("pnk", "P!nk", false, 88),
];

describe("pickArtistAnswer (redesign-search-phase2)", () => {
  it("pink: ningún exacto en el catálogo → elección con los dos de más discos y el primer exacto", () => {
    const answer = pickArtistAnswer("pink", PINK);
    expect(answer.kind).toBe("choice");
    if (answer.kind !== "choice") return;
    expect(answer.candidates.map((c) => [c.artist.id, c.reason])).toEqual([
      ["pf", "catalog"],
      ["lpd", "catalog"],
      ["pink-jp", "identical"],
    ]);
  });

  it("kiss: el exacto con más discos es la respuesta aunque haya otros exactos antes", () => {
    const answer = pickArtistAnswer("kiss", [
      artist("kr", "KISS", true),
      artist("us", "KISS", true, 282),
      artist("kk", "Kiss Kiss", false, 3),
    ]);
    expect(answer).toEqual({ kind: "answer", candidate: { artist: expect.objectContaining({ id: "us" }), reason: "catalog" } });
  });

  it("icon: un exacto con pocos discos sigue ganando a los no exactos", () => {
    const answer = pickArtistAnswer("icon", [artist("icon", "Icon", true, 5), artist("dsp", "Despised Icon", false, 12)]);
    expect(answer.kind === "answer" && answer.candidate.artist.id).toBe("icon");
  });

  it("nirvana: sin datos del catálogo, el primer exacto como antes", () => {
    const answer = pickArtistAnswer("nirvana", [artist("n1", "Nirvana", true), artist("n2", "Nirvana", true)]);
    expect(answer).toEqual({ kind: "answer", candidate: { artist: expect.objectContaining({ id: "n1" }), reason: "identical" } });
  });

  it("sin exactos y un solo candidato del catálogo: respuesta «más cercana»", () => {
    const answer = pickArtistAnswer("floyd", [artist("pf", "Pink Floyd", false, 233), artist("x", "Floyd Cramer", false, 1)]);
    expect(answer).toEqual({ kind: "answer", candidate: { artist: expect.objectContaining({ id: "pf" }), reason: "closest" } });
  });

  it("sin exactos ni catálogo: nada que destacar", () => {
    expect(pickArtistAnswer("zzz", [artist("a", "Algo", false)])).toEqual({ kind: "none" });
  });

  it("answeredIds devuelve lo que ya está arriba", () => {
    expect([...answeredIds(pickArtistAnswer("pink", PINK))]).toEqual(["pf", "lpd", "pink-jp"]);
  });

  it("nameContainsQuery usa palabras completas", () => {
    expect(nameContainsQuery("The Legendary Pink Dots", "pink")).toBe(true);
    expect(nameContainsQuery("P!nk", "pink")).toBe(false);
    expect(nameContainsQuery("Pinkerton", "pink")).toBe(false);
  });
});
