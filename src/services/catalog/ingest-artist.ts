import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { artist, membership, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapArtistType } from "../musicbrainz/mappers";
import { mapArtistProfileFacts } from "../musicbrainz/artist-profile-mappers";
import { saveArtistProfileFacts } from "./artist-profile";
import { mergeMembershipDates, saveArtistLineup } from "./artist-lineup-save";
import { upsertArtistFromMb, VARIOUS_ARTISTS_MBID } from "./artist-upsert";
import { singleFlight, withEntityLock } from "@/db/entity-sync";

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

/**
 * Ingesta memberships de una sola llamada externa; la lectura permanece en getArtistMemberships. La request sale
 * fuera de toda transacción (ADR 0063): dos visitas simultáneas en el proceso comparten la misma ejecución y,
 * entre procesos, la relectura del flag bajo el candado decide quién escribe.
 */
export function ensureArtistMemberships(target: ArtistRow): Promise<void> {
  if (target.membershipsSyncedAt) return Promise.resolve();
  return singleFlight(`memberships:${target.id}`, () => syncArtistMemberships(target.id));
}

async function syncArtistMemberships(artistId: string): Promise<void> {
  const [before] = await db.select().from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!before || before.membershipsSyncedAt) return;

  const detail = before.mbid ? await musicbrainz.getArtistWithRelations(before.mbid) : null;

  // La clave del candado es el id pelado (la de siempre), compartida con procesos que corran una versión anterior.
  await withEntityLock(artistId, async (tx) => {
    const [current] = await tx.select().from(artist).where(eq(artist.id, artistId)).limit(1);
    // Otro proceso la completó mientras se esperaba a MusicBrainz, o cambió el mbid: no se escribe.
    if (!current || current.membershipsSyncedAt || current.mbid !== before.mbid) return;

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
export async function upsertArtistStub(
  mbid: string,
  name: string,
  // Dentro de una transacción, su ejecutor: el cliente global pediría otra conexión del pool (ADR 0063).
  executor: Pick<typeof db, "select" | "insert"> = db,
): Promise<ArtistRow> {
  const [existing] = await executor.select().from(artist).where(eq(artist.mbid, mbid)).limit(1);
  if (existing) return existing;

  const rows = await executor
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
