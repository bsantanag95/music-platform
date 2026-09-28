import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, membership, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapArtistType } from "../musicbrainz/mappers";
import { mapArtistProfileFacts } from "../musicbrainz/artist-profile-mappers";
import { saveArtistProfileFacts } from "./artist-profile";
import { mergeMembershipDates, saveArtistLineup } from "./artist-lineup-save";
import { upsertArtistFromMb, VARIOUS_ARTISTS_MBID } from "./artist-upsert";

export { mergeMembershipDates, upsertArtistFromMb };

export interface ArtistMembership {
  artistId: string;
  name: string;
  type: string;
  role: string | null;
  joinedOn: string | null;
  leftOn: string | null;
}

/** Lee relaciones ya persistidas; nunca consulta MusicBrainz. */
export async function getArtistMemberships(target: ArtistRow): Promise<ArtistMembership[]> {
  const rows = target.type === "group"
    ? await db
        .select({ artistId: artist.id, name: artist.name, type: artist.type, role: membership.role, joinedOn: membership.joinedOn, leftOn: membership.leftOn })
        .from(membership)
        .innerJoin(artist, eq(artist.id, membership.personId))
        .where(and(eq(membership.groupId, target.id), eq(artist.type, "person")))
    : await db
        .select({ artistId: artist.id, name: artist.name, type: artist.type, role: membership.role, joinedOn: membership.joinedOn, leftOn: membership.leftOn })
        .from(membership)
        .innerJoin(artist, eq(artist.id, membership.groupId))
        .where(and(eq(membership.personId, target.id), eq(artist.type, "group")));

  return rows;
}

/** Ingesta memberships de una sola llamada externa; la lectura permanece en getArtistMemberships. */
export async function ensureArtistMemberships(target: ArtistRow): Promise<void> {
  await db.transaction(async (tx) => {
    // El lock cubre también la llamada externa: la relectura del flag decide
    // dentro de la misma transacción quién es el único proceso que ingiere.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 0))`);
    const [current] = await tx.select().from(artist).where(eq(artist.id, target.id)).limit(1);
    if (!current || current.membershipsSyncedAt) return;

    const detail = current.mbid ? await musicbrainz.getArtistWithRelations(current.mbid) : null;
    if (detail) {
      // Pertenencias con sus períodos y músicos de apoyo (openspec: add-artist-lineup-data) y la
      // ficha (país, áreas, fechas, enlaces; openspec: enrich-artist-profile), todo de la misma
      // respuesta, sin otra request.
      await saveArtistLineup(tx, current, detail);
      await saveArtistProfileFacts(tx, current.id, mapArtistProfileFacts(detail));
    }
    await tx.update(artist).set({ membershipsSyncedAt: new Date() }).where(eq(artist.id, current.id));
  });
}

/**
 * Si el artista es un stub (`type='unknown'`) y ya tiene `mbid`, lo enriquece
 * consultando MusicBrainz por id. Si ya está completo, o no tiene `mbid`
 * (nada que consultar), lo devuelve tal cual. Compartido entre
 * `findOrIngestArtist` (stub encontrado por nombre) y `getArtistById`
 * (stub visitado directo por id) para no duplicar el mismo criterio.
 */
async function enrichIfUnknown(row: ArtistRow): Promise<ArtistRow> {
  if (row.type !== "unknown" || !row.mbid) return row;

  const detail = await musicbrainz.getArtist(row.mbid);
  const rows = await db
    .update(artist)
    .set({ type: mapArtistType(detail.type), disambiguation: detail.disambiguation ?? null })
    .where(eq(artist.id, row.id))
    .returning();
  return rows[0] ?? row;
}

/**
 * Busca un artista por su id propio (navegación directa al perfil, no por
 * nombre ni mbid). Si es un stub pendiente de enriquecer, lo completa
 * contra MusicBrainz antes de devolverlo — mismo patrón que ya aplica
 * `findOrIngestArtist` cuando el stub se encuentra por nombre.
 */
export async function getArtistById(id: string): Promise<ArtistRow | null> {
  const [local] = await db.select().from(artist).where(eq(artist.id, id)).limit(1);
  if (!local) return null;
  return enrichIfUnknown(local);
}

/**
 * Busca un artista por nombre. Primero en la base propia; si no está,
 * consulta MusicBrainz en vivo, cachea el mejor resultado y lo retorna.
 * Patrón de cacheo bajo demanda — ver Fase 2 del roadmap.
 */
export async function findOrIngestArtist(name: string): Promise<ArtistRow | null> {
  const [local] = await db.select().from(artist).where(ilike(artist.name, name)).limit(1);

  if (local?.mbid) return enrichIfUnknown(local);

  const results = await musicbrainz.searchArtist(name);
  const best = results.artists[0];
  if (!best) return local ?? null;

  if (local) {
    // Fila local sin mbid en absoluto (caso residual, ej. datos cargados a
    // mano) — se actualiza esa misma fila en vez de insertar una nueva,
    // para no terminar con dos artistas duplicados con el mismo nombre.
    const rows = await db
      .update(artist)
      .set({ mbid: best.id, type: mapArtistType(best.type), disambiguation: best.disambiguation ?? null })
      .where(eq(artist.id, local.id))
      .returning();
    return rows[0] ?? local;
  }

  return upsertArtistFromMb(best.id, best.name, best.type, best.disambiguation ?? null);
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

export interface ArtistSearchStubInput {
  mbid: string;
  name: string;
  /** `type` crudo de MusicBrainz ('Person' | 'Group' | ...); ya viene en la respuesta de búsqueda. */
  mbType: string | undefined;
  /** `disambiguation` de MusicBrainz — va a `artist.disambiguation`, mismo criterio que `upsertArtistFromMb`. */
  disambiguation: string | null;
}

/**
 * Stubs de artista creados desde la página de búsqueda, en una sola
 * operación (INSERT ... ON CONFLICT DO NOTHING) sobre todo el conjunto de
 * candidatos. A diferencia de `upsertArtistStub` (créditos de feat., donde
 * el tipo se desconoce), la respuesta de búsqueda de MusicBrainz ya trae
 * `type` y `disambiguation`: el stub se guarda con su tipo real y la desambiguación,
 * evitando el enriquecimiento extra (`enrichIfUnknown`) en la primera
 * visita al perfil. Nunca sobrescribe una fila existente — puede ser un
 * artista ya enriquecido o con discografía cacheada.
 */
export async function upsertArtistStubsFromSearch(
  stubs: ArtistSearchStubInput[],
): Promise<ArtistRow[]> {
  if (stubs.length === 0) return [];

  await db
    .insert(artist)
    .values(
      stubs.map((stub) => ({
        mbid: stub.mbid,
        name: stub.name,
        // Sin `type` en la respuesta de búsqueda el tipo NO se conoce:
        // `mapArtistType(undefined)` devolvería 'various' (reservado a Various
        // Artists) y el stub se listaría como tal. 'unknown' deja que
        // `enrichIfUnknown` lo resuelva en la primera visita (openspec:
        // redesign-scoped-search).
        type:
          stub.mbid === VARIOUS_ARTISTS_MBID
            ? ("various" as const)
            : stub.mbType
              ? mapArtistType(stub.mbType)
              : ("unknown" as const),
        disambiguation: stub.disambiguation,
      })),
    )
    .onConflictDoNothing({ target: artist.mbid });

  return db
    .select()
    .from(artist)
    .where(inArray(artist.mbid, stubs.map((stub) => stub.mbid)));
}
