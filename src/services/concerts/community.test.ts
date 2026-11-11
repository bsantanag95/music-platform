import { describe, expect, it, vi } from "vitest";

// Reglas puras de los conciertos de la comunidad (openspec: add-shared-concerts-phase2): prueba de setlist.fm, faltantes,
// plausibilidad y nombre por defecto. El SQL (requisitos, límite, duplicado, confirmación por personas, fusión) lo
// verifica scripts/smoke-test-community-concerts.ts contra Postgres real.

vi.mock("@/db", () => ({ db: {} }));

const { missingConfirmations, setlistFmArtistSlug, setlistProvesConcert } = await import("./confirmation");
const { defaultConcertName, implausibleFor } = await import("./community");

describe("setlistProvesConcert", () => {
  const url = "https://www.setlist.fm/setlist/los-bunkers/2009/teatro-caupolican-santiago-chile-3bd6bc8c.html";

  it("prueba el concierto con el artista y el año del cartel", () => {
    expect(setlistProvesConcert(url, ["Los Bunkers"], "2009-05-15")).toBe(true);
    expect(setlistProvesConcert(url.replace("www.", ""), ["Otro", "Los Bunkers"], "2009-05-15")).toBe(true);
  });

  it("no lo prueba con otro artista, otro año o una URL rara", () => {
    expect(setlistProvesConcert(url.replace("los-bunkers", "otro-artista"), ["Los Bunkers"], "2009-05-15")).toBe(false);
    expect(setlistProvesConcert(url, ["Los Bunkers"], "2010-05-15")).toBe(false);
    expect(setlistProvesConcert("https://www.setlist.fm/setlists/los-bunkers-13d6b5bd.html", ["Los Bunkers"], "2009-05-15")).toBe(false);
    expect(setlistProvesConcert("no es una url", ["Los Bunkers"], "2009-05-15")).toBe(false);
    expect(setlistProvesConcert(null, ["Los Bunkers"], "2009-05-15")).toBe(false);
  });

  it("normaliza el nombre como setlist.fm (tildes, mayúsculas, puntuación)", () => {
    expect(setlistFmArtistSlug("Motörhead")).toBe("motorhead");
    expect(setlistFmArtistSlug("Guns N’ Roses")).toBe("guns-n-roses");
    expect(setlistFmArtistSlug("Café Tacvba")).toBe("cafe-tacvba");
  });
});

describe("missingConfirmations", () => {
  it("cuenta lo que falta hasta 3 y no baja de 0", () => {
    expect(missingConfirmations(0)).toBe(3);
    expect(missingConfirmations(1)).toBe(2);
    expect(missingConfirmations(3)).toBe(0);
    expect(missingConfirmations(7)).toBe(0);
  });
});

describe("implausibleFor", () => {
  const band = (lifeBegin: string | null, lifeEnd: string | null, lifeEnded: boolean | null, role: "main" | "support" = "main") => ({
    role,
    lifeBegin,
    lifeEnd,
    lifeEnded,
  });

  it("rechaza antes de formarse y después de separarse", () => {
    expect(implausibleFor(1999, [band("2003", null, false)])).toBe(true);
    expect(implausibleFor(2018, [band("1999-03", "2014-10-02", true)])).toBe(true);
  });

  it("acepta dentro de la actividad y en los años límite", () => {
    expect(implausibleFor(2003, [band("2003", null, false)])).toBe(false);
    expect(implausibleFor(2014, [band("1999", "2014", true)])).toBe(false);
  });

  it("sin datos de actividad, o si no terminó, no restringe", () => {
    expect(implausibleFor(1950, [band(null, null, null)])).toBe(false);
    expect(implausibleFor(2025, [band("1999", "2014", false)])).toBe(false);
  });

  it("solo miran los principales", () => {
    expect(implausibleFor(2018, [band("1990", null, false), band("1999", "2014", true, "support")])).toBe(false);
  });
});

describe("defaultConcertName", () => {
  it("compone «artista en recinto» con el tope de 300", () => {
    expect(defaultConcertName("Los Bunkers", "Teatro Caupolicán")).toBe("Los Bunkers en Teatro Caupolicán");
    expect(defaultConcertName("x".repeat(200), "y".repeat(200))).toHaveLength(300);
  });
});
