// Traduce el vocabulario de MusicBrainz a los enums definidos en
// docs/01-domain/business-rules.md y en el esquema SQL.

export function mapArtistType(mbType: string | undefined): "person" | "group" | "various" {
  if (mbType === "Person") return "person";
  if (mbType === "Group" || mbType === "Orchestra" || mbType === "Choir") return "group";
  // "Character", "Other", o ausente: no es ni claramente persona ni grupo.
  // Se trata como 'various' solo en el caso especial de Various Artists;
  // fuera de ese caso, se resuelve en la capa de ingesta (ver ingest-artist.ts).
  return "various";
}

export function mapReleaseGroupCategory(
  primaryType: string | undefined,
  secondaryTypes: string[] | undefined,
): "studio" | "single_ep" | "compilation" | "live_other" {
  const secondary = secondaryTypes ?? [];

  if (secondary.includes("Compilation")) return "compilation";
  if (secondary.includes("Live")) return "live_other";
  if (primaryType === "Album") return "studio";
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
