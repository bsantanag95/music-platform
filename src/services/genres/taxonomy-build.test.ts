import { describe, expect, it } from "vitest";
import type { GenreCuration } from "./families";
import {
  buildRawGraph,
  buildTaxonomy,
  normalizeSpanishLabel,
  parseCopyLine,
  serializeTaxonomy,
  type TaxonomyFile,
} from "./taxonomy-build";

// Dump en miniatura con las columnas reales de MusicBrainz (CreateTables.sql). Los MBID son
// sintéticos; los ids internos y de link_type imitan los del dump.
const MBID = {
  rock: "00000000-0000-4000-8000-000000000001",
  prog: "00000000-0000-4000-8000-000000000002",
  jazz: "00000000-0000-4000-8000-000000000003",
  acid: "00000000-0000-4000-8000-000000000004",
  funk: "00000000-0000-4000-8000-000000000005",
  asmr: "00000000-0000-4000-8000-000000000006",
};

const tsv = (...cols: (string | null)[]) => cols.map((c) => (c === null ? "\\N" : c)).join("\t");

const tables = {
  genre: [
    tsv("1", MBID.rock, "rock", "", "0", "2019-01-01"),
    tsv("2", MBID.prog, "progressive rock", "", "0", "2019-01-01"),
    tsv("3", MBID.jazz, "jazz", "", "0", "2019-01-01"),
    tsv("4", MBID.acid, "acid jazz", "", "0", "2019-01-01"),
    tsv("5", MBID.funk, "funk", "", "0", "2019-01-01"),
    tsv("6", MBID.asmr, "asmr", "", "0", "2019-01-01"),
  ],
  link_type: [
    tsv("1095", null, "0", "aaaa", "genre", "genre", "subgenre", "", "subgenres", "subgenre of", "has subgenre"),
    tsv("1097", null, "0", "bbbb", "genre", "genre", "fusion of", "", "fusion of", "has fusion genres", "is a fusion of"),
    tsv("1100", null, "0", "cccc", "genre", "genre", "influenced by", "", "influenced by", "influenced genres", "has influences of"),
    tsv("1", null, "0", "dddd", "artist", "artist", "member of band", "", "", "", ""),
  ],
  link: [tsv("10", "1095"), tsv("11", "1097"), tsv("12", "1100"), tsv("13", "1"), tsv("14", "1097")],
  l_genre_genre: [
    tsv("1", "10", "1", "2", "0", "2019-01-01", "0", "", ""), // rock → subgénero progressive rock
    tsv("2", "11", "4", "3", "0", "2019-01-01", "0", "", ""), // acid jazz es fusión de jazz
    tsv("3", "14", "4", "5", "0", "2019-01-01", "0", "", ""), // acid jazz es fusión de funk
    tsv("4", "12", "2", "3", "0", "2019-01-01", "0", "", ""), // progressive rock influido por jazz
    tsv("5", "13", "1", "3", "0", "2019-01-01", "0", "", ""), // link de otro tipo: se ignora
  ],
};

const curation: GenreCuration = {
  roots: { rock: ["rock"], jazz: ["jazz"], funk: ["rnb"] },
  cultural: {},
  overrides: {},
  descriptors: [],
  hidden: ["asmr"],
  namesEs: {},
};

describe("parseCopyLine", () => {
  it("separa por tabulador, convierte \\N en nulo y resuelve escapes", () => {
    expect(parseCopyLine("1\t\\N\ta\\tb\tc\\\\d")).toEqual(["1", null, "a\tb", "c\\d"]);
  });
});

describe("normalizeSpanishLabel", () => {
  it("pone minúscula inicial pero respeta las siglas", () => {
    expect(normalizeSpanishLabel("Rock celta")).toBe("rock celta");
    expect(normalizeSpanishLabel("R&B contemporáneo")).toBe("R&B contemporáneo");
    expect(normalizeSpanishLabel("IDM")).toBe("IDM");
  });

  it("quita la desambiguación de Wikipedia, el artículo y las marcas wiki", () => {
    expect(normalizeSpanishLabel("Footwork (música)")).toBe("footwork");
    expect(normalizeSpanishLabel("El canto bizantino")).toBe("canto bizantino");
    expect(normalizeSpanishLabel("''jazz'' vocal")).toBe("jazz vocal");
  });

  it("descarta lo que no es un nombre: frase larga, con coma, otro alfabeto o vacío", () => {
    expect(normalizeSpanishLabel("Colindat: ronda navideña de grupos de hombres jóvenes")).toBeNull();
    expect(normalizeSpanishLabel("Gagok, ciclos de canto lírico")).toBeNull();
    expect(normalizeSpanishLabel("เพลงไทยเดิม")).toBeNull();
    expect(normalizeSpanishLabel("  ")).toBeNull();
    expect(normalizeSpanishLabel(null)).toBeNull();
  });
});

describe("buildRawGraph", () => {
  it("orienta cada relación: subgénero hacia el padre, fusión e influencia hacia el origen", () => {
    const graph = buildRawGraph(tables);
    expect([...graph.subgenreOf.get(MBID.prog)!]).toEqual([MBID.rock]);
    expect([...graph.fusionOf.get(MBID.acid)!].sort()).toEqual([MBID.jazz, MBID.funk].sort());
    expect([...graph.influencedBy.get(MBID.prog)!]).toEqual([MBID.jazz]);
    expect(graph.subgenreOf.has(MBID.rock)).toBe(false);
  });
});

describe("buildTaxonomy", () => {
  const labels = new Map([
    [MBID.prog, { qid: "Q49451", es: "rock progresivo" }],
    [MBID.rock, { qid: "Q11399", es: "rock" }],
  ]);
  const build = (previous: TaxonomyFile | null = null) =>
    buildTaxonomy({ tables, labels, curation, previous, mbDump: "20260930-002222" });

  it("arma cada género con slug, nombres, clase, familias y relaciones", () => {
    const { file } = build();
    const prog = file.genres.find((g) => g.mbid === MBID.prog)!;
    expect(prog).toEqual({
      mbid: MBID.prog,
      slug: "progressive-rock",
      name: "progressive rock",
      nameEs: "rock progresivo",
      wikidataId: "Q49451",
      kind: "style",
      families: ["rock"],
      subgenreOf: [MBID.rock],
      fusionOf: [],
      influencedBy: [MBID.jazz],
    });
    // Una etiqueta igual al nombre de MusicBrainz no se duplica.
    expect(file.genres.find((g) => g.mbid === MBID.rock)!.nameEs).toBeNull();
    expect(file.genres.find((g) => g.mbid === MBID.acid)!.families).toEqual(["rnb", "jazz"]);
    expect(file.genres.find((g) => g.mbid === MBID.asmr)!.kind).toBe("hidden");
  });

  it("una corrección curada del nombre en español gana sobre la etiqueta de Wikidata", () => {
    const { file } = buildTaxonomy({
      tables,
      labels: new Map([[MBID.jazz, { qid: "Q8341", es: "música culta" }]]),
      curation: { ...curation, namesEs: { jazz: "jazz clásico" } },
      previous: null,
      mbDump: null,
    });
    expect(file.genres.find((g) => g.mbid === MBID.jazz)).toMatchObject({ nameEs: "jazz clásico", wikidataId: "Q8341" });
  });

  it("normaliza la etiqueta de Wikidata y descarta la que es igual al nombre de MusicBrainz", () => {
    const { file } = buildTaxonomy({
      tables,
      labels: new Map([
        [MBID.jazz, { qid: "Q8341", es: "Jazz" }],
        [MBID.rock, { qid: "Q11399", es: "Rock progresivo (música)" }],
      ]),
      curation,
      previous: null,
      mbDump: null,
    });
    expect(file.genres.find((g) => g.mbid === MBID.jazz)?.nameEs).toBeNull();
    expect(file.genres.find((g) => g.mbid === MBID.rock)?.nameEs).toBe("rock progresivo");
  });

  it("ordena por MBID para que el diff sea estable", () => {
    const mbids = build().file.genres.map((g) => g.mbid);
    expect(mbids).toEqual([...mbids].sort());
  });

  it("conserva el slug anterior de un MBID", () => {
    const previous: TaxonomyFile = { mbDump: null, genres: [{ ...build().file.genres[1]!, slug: "prog-rock" }] };
    expect(build(previous).file.genres.find((g) => g.mbid === previous.genres[0]!.mbid)!.slug).toBe("prog-rock");
  });

  it("reporta curaduría rota, familias principales vacías y direcciones inesperadas", () => {
    const { errors } = buildTaxonomy({
      tables: { ...tables, l_genre_genre: [] },
      labels,
      curation: { ...curation, overrides: { "no existe": ["latin"] } },
      previous: null,
      mbDump: null,
    });
    expect(errors).toContain('overrides: "no existe" no existe en MusicBrainz');
    expect(errors).toContain('la familia principal "metal" quedó vacía');
    expect(errors.some((e) => e.startsWith("dirección inesperada"))).toBe(true);
  });
});

describe("serializeTaxonomy", () => {
  it("escribe un género por línea y es JSON válido", () => {
    const file: TaxonomyFile = { mbDump: "x", genres: buildTaxonomy({ tables, labels: new Map(), curation, previous: null, mbDump: "x" }).file.genres };
    const text = serializeTaxonomy(file);
    expect(JSON.parse(text)).toEqual(file);
    expect(text.split("\n").filter((l) => l.startsWith('    {"mbid"'))).toHaveLength(file.genres.length);
  });
});
