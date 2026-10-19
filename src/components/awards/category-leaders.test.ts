import { describe, expect, it } from "vitest";
import type { CategoryHistoryEntry, NominationView } from "@/services/awards/read";
import { categoryLeaders, historyYearAnchor, nomineeArtist } from "./category-leaders";

const cover = { releaseGroupId: "x", coverThumbUrl: null, coverResolved: true };
const album = (id: string, artistName: string | null, won = false): NominationView => ({
  id,
  won,
  text: id,
  credit: null,
  subject: { kind: "release_group", album: { id, title: id, artistName, cover } },
});
const entry = (year: number, nominations: NominationView[]): CategoryHistoryEntry => ({
  ceremony: { year, edition: year - 1988, heldOn: `${year}-02-20` },
  coverage: "complete",
  nominations,
});

describe("nomineeArtist", () => {
  it("toma el artista del sujeto o, sin sujeto, el crédito curado", () => {
    expect(nomineeArtist(album("a", "Bad Bunny"))).toBe("Bad Bunny");
    expect(nomineeArtist({ id: "r", won: false, text: "t", credit: null, subject: { kind: "recording", id: "r", title: "t", artistName: "Shakira", anchor: null } })).toBe("Shakira");
    expect(nomineeArtist({ id: "p", won: false, text: "Olivia Dean", credit: null, subject: { kind: "artist", id: "p", name: "Olivia Dean", photoUrl: null } })).toBe("Olivia Dean");
    expect(nomineeArtist({ id: "x", won: false, text: "Disco — Alguien", credit: "Alguien", subject: null })).toBe("Alguien");
    expect(nomineeArtist({ id: "y", won: false, text: "Disco", credit: null, subject: null })).toBeNull();
  });
});

describe("categoryLeaders", () => {
  const entries = [
    entry(2026, [album("dtmf", "Bad Bunny", true), album("trop", "KAROL G"), album("eterno", "Prince Royce")]),
    entry(2025, [album("llorar", "Shakira", true), album("nadie", "Bad Bunny"), album("otro", "Prince Royce")]),
    entry(2024, [album("bonito", "KAROL G", true), album("sol", "karol g ")]),
  ];

  it("suma nominaciones (las victorias incluidas) y victorias por artista, sin distinguir mayúsculas", () => {
    expect(categoryLeaders(entries)).toEqual([
      { name: "KAROL G", nominations: 3, wins: 1 },
      { name: "Bad Bunny", nominations: 2, wins: 1 },
      { name: "Prince Royce", nominations: 2, wins: 0 },
    ]);
  });

  it("deja fuera a quien tiene una sola nominación y respeta el tope", () => {
    expect(categoryLeaders(entries).map((l) => l.name)).not.toContain("Shakira");
    expect(categoryLeaders(entries, 1)).toHaveLength(1);
    expect(categoryLeaders([])).toEqual([]);
  });
});

describe("historyYearAnchor", () => {
  it("arma el ancla de un año", () => {
    expect(historyYearAnchor(2026)).toBe("anio-2026");
  });
});
