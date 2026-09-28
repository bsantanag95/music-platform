// Traduce el vocabulario de MusicBrainz a los enums definidos en
// docs/01-domain/business-rules.md y en el esquema SQL.

import type { MBArtistDetail, MBArtistRelation, MBArtistSummary } from "./types";

export function mapArtistType(mbType: string | undefined): "person" | "group" | "various" {
  if (mbType === "Person") return "person";
  if (mbType === "Group" || mbType === "Orchestra" || mbType === "Choir") return "group";
  // "Character", "Other", o ausente: no es ni claramente persona ni grupo.
  // Se trata como 'various' solo en el caso especial de Various Artists;
  // fuera de ese caso, se resuelve en la capa de ingesta (ver ingest-artist.ts).
  return "various";
}

const GROUP_TYPES = new Set(["Group", "Orchestra", "Choir"]);

/**
 * Período de una relación de MusicBrainz (openspec: add-artist-lineup-data): fechas con su
 * precisión, si terminó e instrumentos crudos. Una relación con fin anterior al inicio queda
 * sin fechas: no se inventa ni se invierte una fecha.
 */
export interface MappedLineupPeriod {
  beginDate: string | null;
  endDate: string | null;
  ended: boolean;
  instruments: string[];
}

export interface MappedArtistMembership extends MappedLineupPeriod {
  person: MBArtistSummary;
  group: MBArtistSummary;
  /** Resumen para `membership.role`: los instrumentos, sin las marcas. */
  role: string | null;
  joinedOn: string | null;
  leftOn: string | null;
  isFounder: boolean;
  isAdditional: boolean;
}

/** Marcas de MusicBrainz que no son instrumentos: fundador e integrante adicional. */
const FOUNDER_ATTRIBUTE = "original";
const ADDITIONAL_ATTRIBUTE = "additional";
/**
 * Otros atributos de pertenencia que tampoco son instrumentos y no se muestran: `eponymous` (la
 * banda lleva el nombre de la persona: Mick Fleetwood en Fleetwood Mac) y `principal`.
 */
const NON_INSTRUMENT_ATTRIBUTES = new Set([FOUNDER_ATTRIBUTE, ADDITIONAL_ATTRIBUTE, "eponymous", "principal"]);

const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function lineupPeriod(relation: MBArtistRelation): MappedLineupPeriod {
  let beginDate = relation.begin && PARTIAL_DATE.test(relation.begin) ? relation.begin : null;
  let endDate = relation.end && PARTIAL_DATE.test(relation.end) ? relation.end : null;
  if (beginDate && endDate && endDate.slice(0, 4) < beginDate.slice(0, 4)) {
    beginDate = null;
    endDate = null;
  }
  const instruments = [...new Set((relation.attributes ?? []).filter(Boolean))].filter(
    (attribute) => !NON_INSTRUMENT_ATTRIBUTES.has(attribute),
  );
  return { beginDate, endDate, ended: relation.ended === true || endDate !== null, instruments };
}

function isPerson(artist: MBArtistSummary | undefined): artist is MBArtistSummary {
  return artist?.type === "Person";
}

function isGroup(artist: MBArtistSummary | undefined): artist is MBArtistSummary {
  return artist !== undefined && GROUP_TYPES.has(artist.type ?? "");
}

function mapRelation(source: MBArtistDetail, relation: MBArtistRelation): MappedArtistMembership | null {
  if (relation.type !== "member of band" || !relation.artist) return null;

  const sourceSummary: MBArtistSummary = {
    id: source.id,
    name: source.name,
    type: source.type,
    disambiguation: source.disambiguation,
  };
  const person = isPerson(sourceSummary) ? sourceSummary : isPerson(relation.artist) ? relation.artist : null;
  const group = isGroup(sourceSummary) ? sourceSummary : isGroup(relation.artist) ? relation.artist : null;
  if (!person || !group || person.id === group.id) return null;

  const period = lineupPeriod(relation);
  const attributes = relation.attributes ?? [];
  return {
    person,
    group,
    role: period.instruments.length ? period.instruments.join(", ") : null,
    joinedOn: period.beginDate ? normalizeReleaseDate(period.beginDate) : null,
    leftOn: period.endDate ? normalizeReleaseDate(period.endDate) : null,
    isFounder: attributes.includes(FOUNDER_ATTRIBUTE),
    isAdditional: attributes.includes(ADDITIONAL_ATTRIBUTE),
    ...period,
  };
}

/** Una entrada por relación `member of band`: un integrante que volvió trae varias. */
export function mapArtistMemberships(detail: MBArtistDetail): MappedArtistMembership[] {
  return (detail.relations ?? [])
    .map((relation) => mapRelation(detail, relation))
    .filter((membership): membership is MappedArtistMembership => membership !== null);
}

export type ArtistSupportKind = "instrumental" | "vocal" | "general";

const SUPPORT_KINDS: Record<string, ArtistSupportKind> = {
  "instrumental supporting musician": "instrumental",
  "vocal supporting musician": "vocal",
  "supporting musician": "general",
};

/** Músico de apoyo de un artista (grupo o solista), en vivo o en estudio: MusicBrainz no lo distingue. */
export interface MappedArtistSupport extends MappedLineupPeriod {
  musician: MBArtistSummary;
  supported: MBArtistSummary;
  kind: ArtistSupportKind;
}

function sourceSummary(source: MBArtistDetail): MBArtistSummary {
  return { id: source.id, name: source.name, type: source.type, disambiguation: source.disambiguation };
}

/**
 * Relaciones de apoyo del artista, en ambas direcciones: `forward` es el artista consultado
 * apoyando a otro ("supporting drums for"), `backward` otro apoyándolo. MusicBrainz la define
 * de persona a artista, así que se exige que el músico sea una persona confirmada.
 */
export function mapArtistSupports(detail: MBArtistDetail): MappedArtistSupport[] {
  const source = sourceSummary(detail);
  return (detail.relations ?? []).flatMap((relation): MappedArtistSupport[] => {
    const kind = relation.type ? SUPPORT_KINDS[relation.type] : undefined;
    if (!kind || !relation.artist) return [];
    const [musician, supported] =
      relation.direction === "backward" ? [relation.artist, source] : [source, relation.artist];
    if (!isPerson(musician) || musician.id === supported.id) return [];
    return [{ musician, supported, kind, ...lineupPeriod(relation) }];
  });
}

/** Tipos secundarios que no le quitan a un `Album` la categoría de estudio. */
const STUDIO_SECONDARY_TYPES = new Set(["Soundtrack"]);

export function mapReleaseGroupCategory(
  primaryType: string | undefined,
  secondaryTypes: string[] | undefined,
): "studio" | "single_ep" | "compilation" | "live_other" {
  const secondary = secondaryTypes ?? [];

  if (secondary.includes("Compilation")) return "compilation";
  if (secondary.includes("Live")) return "live_other";
  // Un `Album` es de estudio sin tipos secundarios o si solo es `Soundtrack`
  // (More, Obscured by Clouds: se cuentan entre los álbumes del artista). Demo,
  // Remix, DJ-mix, Mixtape/Street, Interview… no son álbumes de estudio
  // (openspec: redesign-song-page, D13 — un demo de 1986 le ganaba al original).
  if (primaryType === "Album") {
    return secondary.every((type) => STUDIO_SECONDARY_TYPES.has(type)) ? "studio" : "live_other";
  }
  if (primaryType === "Single" || primaryType === "EP") return "single_ep";

  // Broadcast, Other, remixes, soundtracks, etc. — se agrupan como
  // "misceláneo" en vez de forzarlos a una categoría que no les calza.
  return "live_other";
}

// MusicBrainz representa la precisión de una fecha en el propio formato del
// valor: 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD'. PostgreSQL exige una fecha completa
// para una columna DATE, así que solo se acepta 'YYYY-MM-DD'. Las fechas
// parciales (o ausentes/inválidas) devuelven null: inventar '1985-01-01' sería
// presentar una precisión que MusicBrainz no proporciona. La evolución futura
// es conservar el año en una columna separada `release_year` (ver
// docs/03-data/sql-model.md).
export function normalizeReleaseDate(date: string | undefined): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Valida que el calendario acepte la fecha (mes 1-12, día válido para el
  // mes/año, incluyendo años bisiestos) — '1985-13-40' no es una fecha real.
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    asUtc.getUTCFullYear() !== year ||
    asUtc.getUTCMonth() !== month - 1 ||
    asUtc.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Año a partir de una fecha de MusicBrainz ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD').
 * A diferencia de `normalizeReleaseDate` (columna DATE, exige precisión
 * completa), acá solo interesa el año para mostrarlo.
 */
export function yearFromMbDate(date: string | undefined | null): number | null {
  const match = date
    ? /^(\d{4})$|^\d{4}-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?$/.exec(date)
    : null;
  return match ? Number(date!.slice(0, 4)) : null;
}
