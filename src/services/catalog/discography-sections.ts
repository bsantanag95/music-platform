import type { ReleaseGroupCategory } from "@/lib/api/schemas";

// Secciones de la discografía de un artista (openspec: fix-artist-discography-ingestion,
// capability `artist-discography`). Se derivan en código de los tipos crudos de
// MusicBrainz y del rol del crédito; `release_group.category` no cambia porque la siguen
// usando recorridos, búsqueda y la franja de discografía del álbum. Las claves son las
// mismas que el parámetro `section` de la página de artista.

export const DISCOGRAPHY_SECTIONS = ["main", "live", "compilations", "singles", "other", "appearances"] as const;

export type DiscographySection = (typeof DISCOGRAPHY_SECTIONS)[number];

/** Secundarios que sacan un disco de Principal o de Sencillos (van a Otros). */
const OTHER_SECONDARY_TYPES = new Set([
  "Demo",
  "Remix",
  "DJ-mix",
  "Mixtape/Street",
  "Interview",
  "Spokenword",
  "Audiobook",
  "Audio drama",
  "Field recording",
]);

export interface DiscographySectionInput {
  /** Tipo primario crudo de MusicBrainz; `null` si la fila todavía no tiene tipos. */
  primaryType: string | null;
  /** Secundarios crudos; `null` si la fila todavía no tiene tipos. */
  secondaryTypes: string[] | null;
  category: ReleaseGroupCategory;
  /** Rol del crédito del artista en el release-group. */
  creditRole: "primary" | "featured";
}

/** Respaldo para filas guardadas antes de la migración 0053, sin tipos crudos. */
const SECTION_BY_CATEGORY: Record<ReleaseGroupCategory, DiscographySection> = {
  studio: "main",
  single_ep: "singles",
  compilation: "compilations",
  live_other: "live",
};

/**
 * Clasifica un release-group en una sola sección, con las reglas en orden: Apariciones,
 * Recopilatorios, En vivo, Otros (secundarios de la lista), Principal (`Album`/`EP` sin
 * secundarios o solo con `Soundtrack`), Sencillos (ídem con `Single`) y Otros para el resto.
 */
export function discographySection({
  primaryType,
  secondaryTypes,
  category,
  creditRole,
}: DiscographySectionInput): DiscographySection {
  if (creditRole === "featured") return "appearances";
  if (primaryType === null && secondaryTypes === null) return SECTION_BY_CATEGORY[category];

  const secondary = secondaryTypes ?? [];
  if (secondary.includes("Compilation")) return "compilations";
  if (secondary.includes("Live")) return "live";
  if (secondary.some((type) => OTHER_SECONDARY_TYPES.has(type))) return "other";

  // Lo que queda son discos sin secundarios o solo con `Soundtrack` (la banda sonora de
  // la propia banda sigue siendo parte de su obra, p. ej. "More" de Pink Floyd).
  const onlySoundtrack = secondary.every((type) => type === "Soundtrack");
  if (onlySoundtrack && (primaryType === "Album" || primaryType === "EP")) return "main";
  if (onlySoundtrack && primaryType === "Single") return "singles";
  return "other";
}
