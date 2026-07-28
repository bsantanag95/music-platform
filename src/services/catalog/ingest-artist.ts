import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { artist, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapArtistType } from "../musicbrainz/mappers";

const VARIOUS_ARTISTS_MBID = "89ad4ac3-39f7-470e-963a-56509c546377";

/**
 * Busca un artista por nombre. Primero en la base propia; si no está,
 * consulta MusicBrainz en vivo, cachea el mejor resultado y lo retorna.
 * Patrón de cacheo bajo demanda — ver Fase 2 del roadmap.
 */
export async function findOrIngestArtist(name: string): Promise<ArtistRow | null> {
  const [local] = await db.select().from(artist).where(ilike(artist.name, name)).limit(1);

  // Ya está completo: tiene mbid y ya sabemos si es persona, grupo o various.
  if (local?.mbid && local.type !== "unknown") return local;

  if (local?.mbid) {
    // Stub ya conocido (creado desde el crédito de otro artista): ya tiene
    // mbid real, solo falta el tipo. Se consulta ese id puntual — no se
    // busca por nombre de nuevo, para no arriesgar hacer match con un
    // homónimo distinto al que ya quedó credited.
    const detail = await musicbrainz.getArtist(local.mbid);
    const rows = await db
      .update(artist)
      .set({ type: mapArtistType(detail.type), bio: detail.disambiguation ?? null })
      .where(eq(artist.id, local.id))
      .returning();
    return rows[0] ?? local;
  }

  const results = await musicbrainz.searchArtist(name);
  const best = results.artists[0];
  if (!best) return local ?? null;

  if (local) {
    // Fila local sin mbid en absoluto (caso residual, ej. datos cargados a
    // mano) — se actualiza esa misma fila en vez de insertar una nueva,
    // para no terminar con dos artistas duplicados con el mismo nombre.
    const rows = await db
      .update(artist)
      .set({ mbid: best.id, type: mapArtistType(best.type), bio: best.disambiguation ?? null })
      .where(eq(artist.id, local.id))
      .returning();
    return rows[0] ?? local;
  }

  return upsertArtistFromMb(best.id, best.name, best.type, best.disambiguation ?? null);
}

/**
 * Crea o actualiza un artista a partir de datos de MusicBrainz. Se usa
 * tanto para el resultado de una búsqueda directa como para los "stubs"
 * que se crean al ingerir créditos de otros artistas (ver
 * ingest-discography.ts), donde el tipo puede no conocerse todavía.
 */
export async function upsertArtistFromMb(
  mbid: string,
  name: string,
  mbType: string | undefined,
  bio: string | null = null,
): Promise<ArtistRow> {
  const type = mbid === VARIOUS_ARTISTS_MBID ? "various" : mapArtistType(mbType);

  const rows = await db
    .insert(artist)
    .values({ mbid, name, type, bio })
    .onConflictDoUpdate({
      target: artist.mbid,
      set: { name, bio },
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error(`No se pudo hacer upsert del artista ${mbid}`);
  return row;
}

/**
 * Upsert "stub": solo mbid + nombre, sin tipo confirmado ('unknown').
 * Se usa al ingerir créditos donde no vale la pena una llamada extra a
 * MusicBrainz solo para conocer el tipo — se enriquece cuando alguien
 * visita el perfil de ese artista directamente.
 */
export async function upsertArtistStub(mbid: string, name: string): Promise<ArtistRow> {
  const [existing] = await db.select().from(artist).where(eq(artist.mbid, mbid)).limit(1);
  if (existing) return existing;

  const rows = await db
    .insert(artist)
    .values({ mbid, name, type: "unknown" })
    .onConflictDoUpdate({ target: artist.mbid, set: { name } })
    .returning();

  const row = rows[0];
  if (!row) throw new Error(`No se pudo hacer upsert del artista stub ${mbid}`);
  return row;
}
