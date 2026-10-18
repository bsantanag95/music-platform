import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readAllAwards, readAward } from "./curation-files";
import {
  CategoriesFileSchema,
  isLinkable,
  nomineeText,
  validateCategories,
  validateCeremony,
  type CategoriesFile,
  type CeremonyFile,
} from "./curation-schema";

const categories: CategoriesFile = {
  award: "grammy",
  voting: "academy",
  categories: [
    { key: "album-of-the-year", tier: "general", subject: "release_group", honors: "performer", name: { es: "Álbum del año", en: "Album of the Year" }, order: 1 },
    { key: "record-of-the-year", tier: "general", subject: "recording", honors: "performer", name: { es: "Grabación del año", en: "Record of the Year" }, order: 2 },
    { key: "best-new-artist", tier: "general", subject: "artist", honors: "performer", name: { es: "Artista nuevo", en: "Best New Artist" }, order: 4 },
  ],
};

const ceremony = (overrides: Partial<CeremonyFile> = {}): CeremonyFile => ({
  award: "grammy",
  year: 2025,
  edition: 67,
  heldOn: "2025-02-02",
  sourceUrl: "https://en.wikipedia.org/wiki/67th_Annual_Grammy_Awards",
  categories: [
    {
      key: "album-of-the-year",
      coverage: "complete",
      nominees: [
        { title: "Cowboy Carter", artist: "Beyoncé", won: true },
        { title: "Brat", artist: "Charli xcx", won: false },
        { title: "Hit Me Hard and Soft", artist: "Billie Eilish", won: false },
      ],
    },
  ],
  ...overrides,
});

describe("validateCeremony", () => {
  it("acepta una ceremonia coherente", () => {
    expect(validateCeremony(ceremony(), categories, "2025.json")).toEqual([]);
  });

  it("rechaza winner_only con nominados que no ganaron, indicando archivo y categoría", () => {
    const errors = validateCeremony(
      ceremony({
        categories: [
          {
            key: "album-of-the-year",
            coverage: "winner_only",
            nominees: [
              { title: "A", artist: "X", won: true },
              { title: "B", artist: "Y", won: false },
            ],
          },
        ],
      }),
      categories,
      "2025.json",
    );
    expect(errors).toEqual([expect.stringContaining("2025.json › album-of-the-year: la cobertura es winner_only")]);
  });

  it("exige ganador, categoría existente, anchor en grabaciones y artist según el tipo", () => {
    const errors = validateCeremony(
      ceremony({
        categories: [
          { key: "album-of-the-year", coverage: "complete", nominees: [{ title: "A", artist: "X", won: false }] },
          { key: "no-existe", coverage: "complete", nominees: [{ title: "A", artist: "X", won: true }] },
          { key: "record-of-the-year", coverage: "complete", nominees: [{ title: "Song", artist: "X", won: true }] },
          { key: "best-new-artist", coverage: "complete", nominees: [{ title: "Doechii", artist: "Doechii", won: true }] },
        ],
      }),
      categories,
      "2025.json",
    );
    expect(errors.join("\n")).toMatch(/album-of-the-year: no tiene ganador/);
    expect(errors.join("\n")).toMatch(/no-existe: la categoría no existe/);
    expect(errors.join("\n")).toMatch(/record-of-the-year #1 .*exige "anchor"/);
    expect(errors.join("\n")).toMatch(/best-new-artist #1 .*no va "artist"/);
  });

  it("rechaza una semilla de otro tipo que la categoría", () => {
    const errors = validateCeremony(
      ceremony({
        categories: [
          {
            key: "album-of-the-year",
            coverage: "winner_only",
            nominees: [
              {
                title: "Cowboy Carter",
                artist: "Beyoncé",
                won: true,
                resolved: {
                  status: "exact",
                  mbid: "11111111-1111-4111-8111-111111111111",
                  seed: { kind: "artist", name: "Beyoncé" },
                },
              },
            ],
          },
        ],
      }),
      categories,
      "2025.json",
    );
    expect(errors).toEqual([expect.stringContaining('la semilla es de tipo "artist"')]);
  });

  it("rechaza una categoría complete con menos de tres nominados", () => {
    const errors = validateCeremony(
      ceremony({
        categories: [
          {
            key: "album-of-the-year",
            coverage: "complete",
            nominees: [
              { title: "A", artist: "X", won: true },
              { title: "B", artist: "Y", won: false },
            ],
          },
        ],
      }),
      categories,
      "2025.json",
    );
    expect(errors).toEqual([expect.stringContaining("2025.json › album-of-the-year: la cobertura es complete pero hay 2 nominados")]);
  });

  it("una categoría winner_only con un solo ganador no activa el mínimo", () => {
    const errors = validateCeremony(
      ceremony({
        categories: [{ key: "album-of-the-year", coverage: "winner_only", nominees: [{ title: "A", artist: "X", won: true }] }],
      }),
      categories,
      "2025.json",
    );
    expect(errors).toEqual([]);
  });

  it("rechaza una fecha de otro año", () => {
    expect(validateCeremony(ceremony({ heldOn: "2024-02-04" }), categories, "2025.json")).toEqual([
      expect.stringContaining("no es del año 2025"),
    ]);
  });
});

describe("validateCategories", () => {
  const base = { subject: "recording" as const, honors: "performer" as const, name: { es: "x", en: "x" } };
  const file = (list: CategoriesFile["categories"]): CategoriesFile => ({ award: "grammy", voting: "academy", categories: list });

  it("el nivel genre exige campo y los demás niveles no lo admiten", () => {
    const errors = validateCategories(
      file([
        { ...base, key: "sin-campo", tier: "genre", order: 1 },
        { ...base, key: "con-campo", tier: "album", field: "pop", order: 2 },
      ]),
      "categories.json",
    );
    expect(errors).toEqual([
      expect.stringContaining('"sin-campo" es de nivel genre y necesita "field"'),
      expect.stringContaining('"field" solo se usa en el nivel genre ("con-campo" es album)'),
    ]);
  });

  it("rechaza un campo partido en dos tramos del orden curado", () => {
    const errors = validateCategories(
      file([
        { ...base, key: "pop-a", tier: "genre", field: "pop", order: 1 },
        { ...base, key: "rock-a", tier: "genre", field: "rock-alternative", order: 2 },
        { ...base, key: "pop-b", tier: "genre", field: "pop", order: 3 },
      ]),
      "categories.json",
    );
    expect(errors).toEqual([expect.stringContaining('campo "pop" no son contiguas')]);
  });

  it("acepta campos contiguos", () => {
    expect(
      validateCategories(
        file([
          { ...base, key: "pop-a", tier: "genre", field: "pop", order: 1 },
          { ...base, key: "pop-b", tier: "genre", field: "pop", order: 2 },
          { ...base, key: "rock-a", tier: "genre", field: "rock-alternative", order: 3 },
        ]),
        "categories.json",
      ),
    ).toEqual([]);
  });
});

describe("nomineeText e isLinkable", () => {
  it("arma el texto visible según haya artista", () => {
    expect(nomineeText({ title: "Midnights", artist: "Taylor Swift", won: true })).toBe("Midnights — Taylor Swift");
    expect(nomineeText({ title: "Doechii", won: false })).toBe("Doechii");
  });

  it("solo enlaza resoluciones exactas o manuales con semilla", () => {
    const seed = { kind: "artist" as const, name: "Doechii" };
    const mbid = "11111111-1111-4111-8111-111111111111";
    expect(isLinkable({ status: "exact", mbid, seed })).toBe(true);
    expect(isLinkable({ status: "manual", mbid, seed })).toBe(true);
    expect(isLinkable({ status: "ambiguous", candidates: [] })).toBe(false);
    expect(isLinkable({ status: "exact", mbid })).toBe(false);
    expect(isLinkable(undefined)).toBe(false);
  });
});

describe("lectura de carpetas", () => {
  it("junta los errores de esquema y de reglas sin lanzar", () => {
    const dir = mkdtempSync(join(tmpdir(), "awards-"));
    const awardDir = join(dir, "grammy");
    mkdirSync(join(awardDir, "ceremonies"), { recursive: true });
    writeFileSync(join(awardDir, "categories.json"), JSON.stringify(categories));
    writeFileSync(join(awardDir, "ceremonies", "2025.json"), JSON.stringify(ceremony()));
    writeFileSync(join(awardDir, "ceremonies", "2024.json"), JSON.stringify(ceremony({ year: 2024, edition: 67, heldOn: "2024-02-04" })));
    const { award, errors } = readAward(awardDir, "grammy");
    expect(award?.ceremonies.map((c) => c.data.year)).toEqual([2024, 2025]);
    expect(errors).toEqual([expect.stringContaining("la edición 67 ya la usa")]);
  });
});

// Los archivos reales de la curaduría: si alguno no valida, la carga abortaría. Corre en CI.
describe("data/awards", () => {
  it("todos los archivos de curaduría son válidos", () => {
    const { errors } = readAllAwards();
    expect(errors).toEqual([]);
  });
});

describe("voting de categories.json", () => {
  const withVoting = (voting: unknown) => CategoriesFileSchema.safeParse({ ...categories, voting });

  it("acepta los cuatro tipos de votación", () => {
    for (const voting of ["academy", "jury", "public", "mixed"]) expect(withVoting(voting).success).toBe(true);
  });

  it("rechaza un valor desconocido y exige el campo", () => {
    expect(withVoting("fans").success).toBe(false);
    expect(CategoriesFileSchema.safeParse({ award: categories.award, categories: categories.categories }).success).toBe(false);
  });
});
