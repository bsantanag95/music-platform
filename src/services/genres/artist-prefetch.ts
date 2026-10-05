import { after } from "next/server";
import { runDiscographySync } from "@/services/catalog/ingest-discography";
import { GENRE_DISCOGRAPHY_PREFETCH } from "./constants";

// Completar discografías al mostrar artistas (openspec: add-genre-artist-discovery, capability
// `genre-artist-discovery`). El debut y el tamaño de la discografía solo existen cuando esta se recorrió
// entera, y la base real casi no las tiene: al mostrar artistas de un género la página programa, DESPUÉS
// de responder, la sincronización de hasta `GENRE_DISCOGRAPHY_PREFETCH` de ellos. Uno tras otro en un solo
// `after()`: acota el tiempo que la cola serial de MusicBrainz queda ocupada por una visita. La
// sincronización es la existente (candado por artista, límite de ritmo de MusicBrainz, géneros de los
// álbumes) y nunca lanza: un fallo se registra y el artista queda pendiente para otra visita.

interface PrefetchCandidate {
  id: string;
  discographyComplete: boolean;
  hasMbid: boolean;
}

/** Artistas a completar: los primeros, en orden de aparición, con la discografía sin explorar y con MBID. */
export function discographyPrefetchCandidates(artists: readonly PrefetchCandidate[]): string[] {
  return artists
    .filter((artist) => !artist.discographyComplete && artist.hasMbid)
    .slice(0, GENRE_DISCOGRAPHY_PREFETCH)
    .map((artist) => artist.id);
}

/** Programa la sincronización de las discografías pendientes de los artistas mostrados. No espera. */
export function scheduleGenreArtistsDiscographySync(artists: readonly PrefetchCandidate[]): void {
  const ids = discographyPrefetchCandidates(artists);
  if (ids.length === 0) return;
  try {
    after(async () => {
      for (const id of ids) await runDiscographySync(id);
    });
  } catch {
    // Fuera de una request (scripts): `after()` no está disponible; el relleno operativo cubre ese caso.
    console.warn("[genre-artists] completado de discografías omitido: fuera de una request");
  }
}
