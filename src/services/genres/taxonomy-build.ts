// Construcción de la taxonomía de géneros a partir del dump core de MusicBrainz (CC0) y de las
// etiquetas de Wikidata (openspec: add-genre-taxonomy, design D2). Módulo puro: el script
// `scripts/build-genre-taxonomy.ts` lee los archivos y llama a estas funciones.

import {
  assignFamilies,
  emptyMainFamilies,
  validateCuration,
  type FamilyKey,
  type GenreCuration,
  type TaxonomyKind,
} from "./families";
import { assignGenreSlugs } from "./slug";

/** Tablas del dump que hacen falta (las únicas que se extraen del `mbdump.tar.bz2`). */
export const DUMP_TABLES = ["genre", "l_genre_genre", "link", "link_type"] as const;
export type DumpTable = (typeof DUMP_TABLES)[number];

/** Un género tal como queda en `data/genres/taxonomy.json`. */
export interface TaxonomyGenre {
  mbid: string;
  slug: string;
  name: string;
  nameEs: string | null;
  wikidataId: string | null;
  kind: TaxonomyKind;
  families: FamilyKey[];
  /** MBIDs de los géneros de los que es subgénero. */
  subgenreOf: string[];
  /** MBIDs de los géneros de los que es fusión. */
  fusionOf: string[];
  /** MBIDs de los géneros que lo influyeron. */
  influencedBy: string[];
}

export interface TaxonomyFile {
  /** Marca del dump de MusicBrainz usado (archivo TIMESTAMP del dump), si se conoce. */
  mbDump: string | null;
  genres: TaxonomyGenre[];
}

/** Etiquetas de Wikidata de un género, por MBID (P8052). */
export interface WikidataGenreLabel {
  qid: string;
  es: string | null;
}

/**
 * Una línea del formato COPY de PostgreSQL (el de los dumps de MusicBrainz): columnas separadas
 * por tabulador, `\N` como nulo y escapes con barra invertida.
 */
export function parseCopyLine(line: string): (string | null)[] {
  return line.split("\t").map((raw) => {
    if (raw === "\\N") return null;
    return raw.replace(/\\(.)/g, (_, ch: string) => (ch === "t" ? "\t" : ch === "n" ? "\n" : ch === "r" ? "\r" : ch));
  });
}

interface RawGraph {
  /** MBID → nombre. */
  genres: Map<string, string>;
  subgenreOf: Map<string, Set<string>>;
  fusionOf: Map<string, Set<string>>;
  influencedBy: Map<string, Set<string>>;
}

const RELATION_LINK_TYPES = { subgenre: "subgenreOf", "fusion of": "fusionOf", "influenced by": "influencedBy" } as const;

/**
 * Arma el grafo desde las líneas de las cuatro tablas. Columnas (admin/sql/CreateTables.sql):
 * genre(id, gid, name, …), l_genre_genre(id, link, entity0, entity1, …), link(id, link_type, …),
 * link_type(id, parent, child_order, gid, entity_type0, entity_type1, name, …).
 *
 * Direcciones verificadas contra la web de MusicBrainz: en "subgenre" entity0 es el padre y
 * entity1 el subgénero; en "fusion of" e "influenced by" entity0 es la fusión / el influido.
 */
export function buildRawGraph(tables: Record<DumpTable, string[]>): RawGraph {
  const rows = (table: DumpTable) => tables[table].filter((l) => l.length > 0).map(parseCopyLine);

  const genreById = new Map<string, { mbid: string; name: string }>();
  for (const [id, gid, name] of rows("genre")) {
    if (!id || !gid || !name) throw new Error(`fila de genre incompleta: ${id}`);
    genreById.set(id, { mbid: gid, name });
  }

  const linkTypeById = new Map<string, keyof typeof RELATION_LINK_TYPES>();
  for (const cols of rows("link_type")) {
    const [id, , , , type0, type1, name] = cols;
    if (type0 === "genre" && type1 === "genre" && name && name in RELATION_LINK_TYPES && id) {
      linkTypeById.set(id, name as keyof typeof RELATION_LINK_TYPES);
    }
  }
  const linkKind = new Map<string, keyof typeof RELATION_LINK_TYPES>();
  for (const [id, linkTypeId] of rows("link")) {
    const kind = linkTypeId ? linkTypeById.get(linkTypeId) : undefined;
    if (id && kind) linkKind.set(id, kind);
  }

  const graph: RawGraph = {
    genres: new Map([...genreById.values()].map((g) => [g.mbid, g.name])),
    subgenreOf: new Map(),
    fusionOf: new Map(),
    influencedBy: new Map(),
  };
  const add = (map: Map<string, Set<string>>, from: string, to: string) => {
    if (from === to) return;
    map.set(from, (map.get(from) ?? new Set()).add(to));
  };
  for (const [, linkId, e0, e1] of rows("l_genre_genre")) {
    const kind = linkId ? linkKind.get(linkId) : undefined;
    const a = e0 ? genreById.get(e0) : undefined;
    const b = e1 ? genreById.get(e1) : undefined;
    if (!kind || !a || !b) continue;
    if (kind === "subgenre") add(graph.subgenreOf, b.mbid, a.mbid);
    else add(graph[RELATION_LINK_TYPES[kind]], a.mbid, b.mbid);
  }
  return graph;
}

export interface BuildInput {
  tables: Record<DumpTable, string[]>;
  labels: ReadonlyMap<string, WikidataGenreLabel>;
  curation: GenreCuration;
  /** `taxonomy.json` anterior, para conservar slugs. */
  previous: TaxonomyFile | null;
  mbDump: string | null;
}

/** Comprobaciones de sentido sobre direcciones de relación conocidas (falla si el dump cambió de forma). */
const DIRECTION_PROBES: { genre: string; related: string; kind: "subgenreOf" | "fusionOf" | "influencedBy" }[] = [
  { genre: "progressive rock", related: "rock", kind: "subgenreOf" },
  { genre: "acid jazz", related: "jazz", kind: "fusionOf" },
  { genre: "progressive rock", related: "jazz", kind: "influencedBy" },
];

export interface BuildResult {
  file: TaxonomyFile;
  errors: string[];
  /** Raíces con descendientes que la curaduría no mapea (caen en "Del mundo"). */
  unmappedRoots: string[];
  ruleCounts: Record<string, number>;
}

/** Más largo que esto la etiqueta es una frase de artículo, no el nombre de un género. */
const MAX_NAME_ES_LENGTH = 40;

/**
 * Deja una etiqueta de Wikidata (P8052) en forma de nombre de género: minúscula inicial, sin
 * artículo ni desambiguación de Wikipedia ("Footwork (música)"), sin marcas wiki. Devuelve null si
 * no sirve como nombre (frase larga, con coma o en otro alfabeto): se usa el de MusicBrainz o la
 * corrección curada. Las siglas ("R&B", "IDM") conservan las mayúsculas.
 */
export function normalizeSpanishLabel(raw: string | null | undefined): string | null {
  let label = (raw ?? "").replace(/''+/g, "").replace(/[“”]/g, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  label = label.replace(/^(el|la|los|las)\s+(?=\S)/i, "");
  if (!label || label.length > MAX_NAME_ES_LENGTH || label.includes(",")) return null;
  if (/[^\p{Script=Latin}\p{N}\s\-'’&./+!]/u.test(label)) return null;
  return label.replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase());
}

export function buildTaxonomy(input: BuildInput): BuildResult {
  const graph = buildRawGraph(input.tables);
  const errors: string[] = [];

  const nameCount = new Map<string, number>();
  for (const name of graph.genres.values()) nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  for (const [name, n] of nameCount) if (n > 1) errors.push(`nombre de género repetido en MusicBrainz: "${name}"`);

  const mbidByName = new Map([...graph.genres].map(([mbid, name]) => [name, mbid]));
  for (const probe of DIRECTION_PROBES) {
    const g = mbidByName.get(probe.genre);
    const r = mbidByName.get(probe.related);
    if (!g || !r || !graph[probe.kind].get(g)?.has(r)) {
      errors.push(`dirección inesperada: se esperaba "${probe.genre}" ${probe.kind} "${probe.related}"`);
    }
  }

  const names = (mbids: Set<string> | undefined) => [...(mbids ?? [])].map((m) => graph.genres.get(m)!);
  const nodes = [...graph.genres].map(([mbid, name]) => ({
    name,
    parents: names(graph.subgenreOf.get(mbid)),
    fusionOf: names(graph.fusionOf.get(mbid)),
  }));
  errors.push(...validateCuration(nodes, input.curation));
  const assignments = assignFamilies(nodes, input.curation);
  for (const family of emptyMainFamilies(assignments)) errors.push(`la familia principal "${family}" quedó vacía`);

  const previousSlugs = new Map((input.previous?.genres ?? []).map((g) => [g.mbid, g.slug]));
  const slugs = assignGenreSlugs(
    [...graph.genres].map(([mbid, name]) => ({ mbid, name })),
    previousSlugs,
  );

  const sorted = (mbids: Set<string> | undefined) => [...(mbids ?? [])].sort();
  const genres: TaxonomyGenre[] = [...graph.genres]
    .map(([mbid, name]) => {
      const a = assignments.get(name)!;
      const label = input.labels.get(mbid);
      const nameEs = input.curation.namesEs[name]?.trim() || normalizeSpanishLabel(label?.es);
      return {
        mbid,
        slug: slugs.get(mbid)!,
        name,
        // Un nombre igual al de MusicBrainz no aporta (la etiqueta de Wikidata ya sale en minúscula inicial).
        // Solo las mayúsculas curadas de una sigla ("EDM") lo hacen distinto.
        nameEs: nameEs && nameEs !== name ? nameEs : null,
        wikidataId: label?.qid ?? null,
        kind: a.kind,
        families: a.families,
        subgenreOf: sorted(graph.subgenreOf.get(mbid)),
        fusionOf: sorted(graph.fusionOf.get(mbid)),
        influencedBy: sorted(graph.influencedBy.get(mbid)),
      };
    })
    .sort((x, y) => x.mbid.localeCompare(y.mbid));

  const hasChildren = new Set<string>();
  for (const parents of graph.subgenreOf.values()) for (const p of parents) hasChildren.add(p);
  const unmappedRoots = [...hasChildren]
    .filter((mbid) => !graph.subgenreOf.get(mbid)?.size)
    .map((mbid) => graph.genres.get(mbid)!)
    .filter((name) => !(name in input.curation.roots) && !(name in input.curation.overrides))
    .sort();

  const ruleCounts: Record<string, number> = {};
  for (const a of assignments.values()) ruleCounts[a.rule] = (ruleCounts[a.rule] ?? 0) + 1;

  return { file: { mbDump: input.mbDump, genres }, errors, unmappedRoots, ruleCounts };
}

/**
 * Serializa con un género por línea: el diff de una actualización muestra exactamente qué
 * géneros cambiaron, y el archivo se mantiene compacto.
 */
export function serializeTaxonomy(file: TaxonomyFile): string {
  const lines = file.genres.map((g) => `    ${JSON.stringify(g)}`);
  return `{\n  "mbDump": ${JSON.stringify(file.mbDump)},\n  "genres": [\n${lines.join(",\n")}\n  ]\n}\n`;
}
