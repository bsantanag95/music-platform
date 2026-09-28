import { db } from "@/db";
import { artist, type ArtistRow } from "@/db/schema";
import { mapArtistType } from "../musicbrainz/mappers";

export const VARIOUS_ARTISTS_MBID = "89ad4ac3-39f7-470e-963a-56509c546377";

/**
 * Crea o actualiza un artista a partir de datos de MusicBrainz. Se usa
 * tanto para el resultado de una búsqueda directa como para los "stubs"
 * que se crean al ingerir créditos de otros artistas (ver
 * ingest-discography.ts) o la alineación (artist-lineup-save.ts), donde el
 * tipo puede no conocerse todavía.
 */
export async function upsertArtistFromMb(
  mbid: string,
  name: string,
  mbType: string | undefined,
  disambiguation: string | null = null,
  executor: Pick<typeof db, "insert"> = db,
): Promise<ArtistRow> {
  const type = mbid === VARIOUS_ARTISTS_MBID ? "various" : mapArtistType(mbType);

  const rows = await executor
    .insert(artist)
    .values({ mbid, name, type, disambiguation })
    .onConflictDoUpdate({
      target: artist.mbid,
      set: { name, type, disambiguation },
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error(`No se pudo hacer upsert del artista ${mbid}`);
  return row;
}
