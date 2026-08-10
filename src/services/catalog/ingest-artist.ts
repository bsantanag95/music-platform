import { and, eq, ilike, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, membership, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapArtistMemberships, mapArtistType, type MappedArtistMembership } from "../musicbrainz/mappers";

const VARIOUS_ARTISTS_MBID = "89ad4ac3-39f7-470e-963a-56509c546377";

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

function mergeMemberships(memberships: MappedArtistMembership[]): MappedArtistMembership[] {
  const merged = new Map<string, MappedArtistMembership>();
  for (const item of memberships) {
    const key = `${item.person.id}:${item.group.id}`;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, item);
      continue;
    }

    const roles = [...new Set([previous.role, item.role].filter((role): role is string => Boolean(role)).flatMap((role) => role.split(", ")))].sort();
    const joinedOn = previous.joinedOn && item.joinedOn
      ? (previous.joinedOn < item.joinedOn ? previous.joinedOn : item.joinedOn)
      : previous.joinedOn ?? item.joinedOn;
    const leftOn = previous.leftOn && item.leftOn
      ? (previous.leftOn > item.leftOn ? previous.leftOn : item.leftOn)
      : previous.leftOn ?? item.leftOn;
    merged.set(key, {
      ...previous,
      role: roles.length ? roles.join(", ") : null,
      joinedOn,
      leftOn,
    });
  }
  return [...merged.values()];
}

/** Ingesta memberships de una sola llamada externa; la lectura permanece en getArtistMemberships. */
export async function ensureArtistMemberships(target: ArtistRow): Promise<void> {
  await db.transaction(async (tx) => {
    // El lock cubre también la llamada externa: la relectura del flag decide
    // dentro de la misma transacción quién es el único proceso que ingiere.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${target.id}, 0))`);
    const [current] = await tx.select().from(artist).where(eq(artist.id, target.id)).limit(1);
    if (!current || current.membershipsSyncedAt) return;

    const memberships = current.mbid
      ? mergeMemberships(mapArtistMemberships(await musicbrainz.getArtistWithRelations(current.mbid)))
      : [];
    const pairs: Array<{ personId: string; groupId: string }> = [];

    for (const item of memberships) {
      const person = await upsertArtistFromMb(item.person.id, item.person.name, item.person.type, item.person.disambiguation ?? null, tx);
      const group = await upsertArtistFromMb(item.group.id, item.group.name, item.group.type, item.group.disambiguation ?? null, tx);
      pairs.push({ personId: person.id, groupId: group.id });
      await tx
        .insert(membership)
        .values({ personId: person.id, groupId: group.id, role: item.role, joinedOn: item.joinedOn, leftOn: item.leftOn })
        .onConflictDoUpdate({
          target: [membership.personId, membership.groupId],
          set: { role: item.role, joinedOn: item.joinedOn, leftOn: item.leftOn },
        });
    }

    const targetColumn = current.type === "group" ? membership.groupId : membership.personId;
    const relatedColumn = current.type === "group" ? membership.personId : membership.groupId;
    const relatedIds = pairs.map((pair) => current.type === "group" ? pair.personId : pair.groupId);
    const scope = eq(targetColumn, current.id);
    await tx.delete(membership).where(relatedIds.length ? and(scope, notInArray(relatedColumn, relatedIds)) : scope);
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
    .set({ type: mapArtistType(detail.type), bio: detail.disambiguation ?? null })
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
  executor: Pick<typeof db, "insert"> = db,
): Promise<ArtistRow> {
  const type = mbid === VARIOUS_ARTISTS_MBID ? "various" : mapArtistType(mbType);

  const rows = await executor
    .insert(artist)
    .values({ mbid, name, type, bio })
    .onConflictDoUpdate({
      target: artist.mbid,
      set: { name, type, bio },
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
