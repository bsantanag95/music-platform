import { cache } from "react";
import type { ReleaseGroup } from "@/lib/api/schemas";
import { listNewReleases, listTopRated } from "@/services/discovery/discovery";
import { GENRE_RAIL_SIZE } from "./constants";
import { albumInGenreTree } from "./read";

// Rieles del Resumen de un género (openspec: redesign-genre-page, capability `genre-page-overview`).
// Reutilizan las lecturas de Explorar acotadas al subárbol del género, así que heredan sus umbrales:
// "Esenciales" devuelve `[]` con menos de `MIN_ALBUMS_FOR_SECTION` álbumes con `MIN_RATINGS_PER_ALBUM`
// valoraciones y la página no renderiza el riel.

/**
 * Esenciales: los mejor valorados del género o de sus subgéneros. Memoizada por request: el riel y la
 * invitación de "Tu huella" (que depende de que el riel exista) comparten una sola lectura.
 */
export const getGenreEssentials = cache((genreId: string): Promise<ReleaseGroup[]> => {
  return listTopRated(GENRE_RAIL_SIZE, albumInGenreTree(genreId));
});

/** Novedades: estudio y single/EP con año conocido, por año descendente. */
export function getGenreNewReleases(genreId: string): Promise<ReleaseGroup[]> {
  return listNewReleases(GENRE_RAIL_SIZE, albumInGenreTree(genreId));
}
