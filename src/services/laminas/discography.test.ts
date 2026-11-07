// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: vi.fn() }));

import { bestRated, getDiscographyLamina } from "./discography";

// El SQL y la visibilidad por visitante los ejecuta `scripts/smoke-test-discography-lamina.ts` contra Postgres real.
describe("bestRated", () => {
  const disc = (stars: number, detailedScore: number | null = null) => ({ stars, detailedScore });

  it("elige por nota, con la detallada por encima de las estrellas", () => {
    const low = disc(3);
    const high = disc(4.5, 90);
    const mid = disc(4);
    expect(bestRated([low, high, mid], 2)).toEqual(new Set([high, mid]));
  });

  it("a igual nota, el más antiguo", () => {
    const first = disc(4);
    const second = disc(4);
    const picked = bestRated([first, second], 1);
    expect(picked.has(first)).toBe(true);
    expect(picked.has(second)).toBe(false);
  });
});

describe("getDiscographyLamina", () => {
  it("un artista que no es un identificador no consulta nada", async () => {
    expect(await getDiscographyLamina("ana", "no-es-un-id", null)).toBeNull();
  });
});
