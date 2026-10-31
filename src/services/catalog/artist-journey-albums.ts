import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { isCoverResolved } from "@/services/catalog/cover-resolution";
import { readArtistDiscography } from "@/services/catalog/ingest-discography";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

/**
 * Discos con crédito principal del artista en el formato del modal de inicio del recorrido
 * (openspec: refine-artist-page-phase1, design D2). Se piden al abrir el modal: antes viajaban en
 * cada visita con sesión aunque el modal casi nunca se abre. Lee la discografía guardada, sin
 * ingerir: la página del artista ya la aseguró.
 */
export async function listArtistJourneyAlbums(artistId: string): Promise<ReleaseGroup[]> {
  return (await readArtistDiscography(artistId))
    .filter((row) => row.creditRole === "primary")
    .map((row) => ({
      id: row.id,
      mbid: row.mbid,
      title: row.title,
      category: row.category as ReleaseGroupCategory,
      firstReleaseDate: row.firstReleaseDate,
      firstReleaseYear: row.firstReleaseYear,
      createdAt: row.createdAt.toISOString(),
      coverThumbUrl: row.coverThumbUrl,
      coverResolved: isCoverResolved(row),
    }));
}

/** El artista existe en la base propia (sin enriquecer stubs ni consultar MusicBrainz). */
export async function artistExists(artistId: string): Promise<boolean> {
  const [found] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, artistId)).limit(1);
  return Boolean(found);
}
