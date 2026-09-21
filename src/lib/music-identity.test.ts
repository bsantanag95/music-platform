import { describe, expect, it } from "vitest";
import {
  EMPTY_MUSIC_IDENTITY,
  formatLocalTime,
  GENRES,
  hasMusicIdentity,
  isSingleLine,
  isValidTimezone,
  LISTENING_FORMATS,
  MUSIC_IDENTITY_LIMITS,
  PROMPT_KEYS,
  SELF_ROLES,
  TIMEZONES,
} from "./music-identity";

describe("listas cerradas", () => {
  it("coinciden con las de la spec", () => {
    expect(SELF_ROLES).toEqual(["listener", "collector", "musician", "dj", "critic", "radio-host"]);
    expect(LISTENING_FORMATS).toEqual(["vinyl", "cd", "cassette", "streaming", "digital"]);
    expect(GENRES).toHaveLength(20);
    expect(GENRES).toEqual(expect.arrayContaining(["post-punk", "jazz", "shoegaze", "bossa-nova"]));
    expect(PROMPT_KEYS).toHaveLength(8);
  });

  it("no tienen repetidos y son claves estables (kebab-case)", () => {
    for (const list of [SELF_ROLES, GENRES, LISTENING_FORMATS, PROMPT_KEYS] as const) {
      expect(new Set(list).size).toBe(list.length);
      for (const key of list) expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("los topes son los de la spec", () => {
    expect(MUSIC_IDENTITY_LIMITS).toEqual({
      selfRoles: 3,
      genres: 5,
      listeningFormats: 5,
      prompts: 3,
      promptAnswer: 100,
    });
  });
});

describe("hasMusicIdentity", () => {
  it("es false con todo vacío y true con cualquiera de las partes", () => {
    expect(hasMusicIdentity(EMPTY_MUSIC_IDENTITY)).toBe(false);
    expect(hasMusicIdentity({ ...EMPTY_MUSIC_IDENTITY, genres: ["jazz"] })).toBe(true);
    expect(hasMusicIdentity({ ...EMPTY_MUSIC_IDENTITY, selfRoles: ["dj"] })).toBe(true);
    expect(hasMusicIdentity({ ...EMPTY_MUSIC_IDENTITY, listeningFormats: ["vinyl"] })).toBe(true);
    expect(
      hasMusicIdentity({ ...EMPTY_MUSIC_IDENTITY, prompts: [{ promptKey: "first-record", answer: "x", position: 0 }] }),
    ).toBe(true);
  });
});

describe("isSingleLine", () => {
  it("rechaza saltos de línea de cualquier tipo", () => {
    expect(isSingleLine("una sola línea")).toBe(true);
    expect(isSingleLine("dos\nlíneas")).toBe(false);
    expect(isSingleLine("dos\r\nlíneas")).toBe(false);
    expect(isSingleLine("dos\rlíneas")).toBe(false);
  });
});

describe("zonas horarias", () => {
  it("acepta zonas IANA de la lista", () => {
    expect(isValidTimezone("America/Santiago")).toBe(true);
    expect(isValidTimezone("Europe/Madrid")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("rechaza texto libre, zonas inventadas y variantes de mayúsculas", () => {
    expect(isValidTimezone("hora de mi casa")).toBe(false);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
    expect(isValidTimezone("america/santiago")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });

  it("la lista está ordenada, sin repetidos y es la que ofrece el selector", () => {
    expect(TIMEZONES.length).toBeGreaterThan(30);
    expect([...TIMEZONES]).toEqual([...TIMEZONES].sort());
    expect(new Set(TIMEZONES).size).toBe(TIMEZONES.length);
    expect(TIMEZONES).toContain("America/Santiago");
  });
});

describe("formatLocalTime", () => {
  // 2026-09-21 17:32 UTC = 14:32 en Santiago (UTC−3 en septiembre).
  const now = new Date("2026-09-21T17:32:00Z");

  it("da la hora de la zona como HH:mm de 24 horas", () => {
    expect(formatLocalTime("America/Santiago", "es", now)).toBe("14:32");
    expect(formatLocalTime("UTC", "en", now)).toBe("17:32");
    expect(formatLocalTime("Asia/Tokyo", "es", now)).toBe("02:32");
  });

  it("devuelve null con una zona que no es válida", () => {
    expect(formatLocalTime("hora de mi casa", "es", now)).toBeNull();
    expect(formatLocalTime("", "es", now)).toBeNull();
  });
});
