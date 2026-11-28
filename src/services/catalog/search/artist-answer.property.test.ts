// @vitest-environment node
// Leyes de la respuesta de Artistas (openspec: redesign-search-phase2, design D1).
import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { CHOICE_MIN_DISCS, pickArtistAnswer } from "./artist-answer";
import type { ArtistSearchResult } from "./types";

const NAMES = ["Pink", "pink floyd", "The Pink Dots", "Kiss", "KISS", "Kiss Kiss", "Queen", "Icon", "Despised Icon", "Otro"];
const QUERIES = ["pink", "kiss", "queen", "icon", "pink floyd"];

const results = fc
  .array(
    fc.record({
      name: fc.constantFrom(...NAMES),
      exact: fc.boolean(),
      discCount: fc.option(fc.integer({ min: 0, max: 300 }), { nil: null }),
    }),
    { maxLength: 12 },
  )
  .map((rows) =>
    rows.map(
      (row, index): ArtistSearchResult => ({
        kind: "artist",
        id: `a${index}`,
        mbid: null,
        name: row.name,
        disambiguation: null,
        artistType: "group",
        country: null,
        cached: row.discCount !== null,
        exact: row.exact,
        discCount: row.discCount,
      }),
    ),
  );

describe("pickArtistAnswer: propiedades", () => {
  it("lo destacado siempre está entre los resultados y nunca hay más de 3 candidatos", () => {
    assertProperty(
      fc.property(fc.constantFrom(...QUERIES), results, (query, list) => {
        const answer = pickArtistAnswer(query, list);
        const picked = answer.kind === "answer" ? [answer.candidate] : answer.kind === "choice" ? answer.candidates : [];
        return picked.length <= 3 && picked.every((c) => list.includes(c.artist));
      }),
    );
  });

  it("si hay un exacto con discos, la respuesta es un exacto con el máximo de discos", () => {
    assertProperty(
      fc.property(fc.constantFrom(...QUERIES), results, (query, list) => {
        const exactDiscs = list.filter((a) => a.exact && (a.discCount ?? 0) >= 1).map((a) => a.discCount ?? 0);
        if (exactDiscs.length === 0) return true;
        const answer = pickArtistAnswer(query, list);
        return answer.kind === "answer" && answer.candidate.artist.exact && answer.candidate.artist.discCount === Math.max(...exactDiscs);
      }),
    );
  });

  it("en la elección, los no exactos tienen al menos el mínimo de discos", () => {
    assertProperty(
      fc.property(fc.constantFrom(...QUERIES), results, (query, list) => {
        const answer = pickArtistAnswer(query, list);
        if (answer.kind !== "choice") return true;
        return answer.candidates.every((c) => c.artist.exact || (c.artist.discCount ?? 0) >= CHOICE_MIN_DISCS);
      }),
    );
  });
});
