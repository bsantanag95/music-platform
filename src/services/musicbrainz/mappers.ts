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
