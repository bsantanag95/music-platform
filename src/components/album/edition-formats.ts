// Familias de formato de las ediciones (openspec: refine-album-page-phase3, D4), compartidas por el filtro de la pestaña
// Ediciones (componente de cliente) y el resumen de «En este disco» de la pestaña Canciones (servidor; openspec:
// modernize-album-page-phase2). Funciones puras.

export type FormatFamily = "vinyl" | "cd" | "digital" | "cassette" | "other";

/** Familia de formato para el filtro ("12\" Vinyl" → vinyl, "Hybrid SACD (CD layer)" → cd). */
export function formatFamily(format: string): FormatFamily {
  if (/vinyl/i.test(format)) return "vinyl";
  if (/\bcd\b|sacd|hdcd|blu-spec|shm-cd/i.test(format)) return "cd";
  if (/digital/i.test(format)) return "digital";
  if (/cassette/i.test(format)) return "cassette";
  return "other";
}

/** Orden fijo de los filtros: el formato más común primero. */
export const FAMILY_ORDER: FormatFamily[] = ["cd", "vinyl", "cassette", "digital", "other"];

interface EditionLike {
  mbid: string;
  status: string | null;
  formats: string[];
}

/** La edición tiene algún medio de esa familia. */
export function hasFamily(edition: Pick<EditionLike, "formats">, family: FormatFamily): boolean {
  return edition.formats.some((format) => formatFamily(format) === family);
}

/**
 * Ediciones por familia, con el mismo alcance que el filtro por defecto de Ediciones (las oficiales más la representativa):
 * una edición con CD y DVD cuenta en las dos. Solo familias con alguna edición, en el orden fijo.
 */
export function editionFamilyCounts(
  editions: EditionLike[],
  representativeMbid: string | null,
): { total: number; families: { family: FormatFamily; count: number }[] } {
  const inScope = editions.filter((edition) => edition.status === "Official" || edition.mbid === representativeMbid);
  const families = FAMILY_ORDER.map((family) => ({ family, count: inScope.filter((edition) => hasFamily(edition, family)).length })).filter(
    (entry) => entry.count > 0,
  );
  return { total: editions.length, families };
}
