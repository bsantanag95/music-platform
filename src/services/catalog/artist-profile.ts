import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistLink, type ArtistRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { mapArtistProfileFacts, type ArtistProfileFacts } from "../musicbrainz/artist-profile-mappers";
import { mapArtistType } from "../musicbrainz/mappers";
import { saveArtistLineup } from "./artist-lineup-save";
import { singleFlight, withEntityLock } from "@/db/entity-sync";

// Ficha del artista desde MusicBrainz (openspec: enrich-artist-profile, capability
// `artist-profile-facts`). La primera sincronización llega en la misma request que las
// pertenencias (`ensureArtistMemberships`); después se renueva en segundo plano cada 30 días,
// junto con la alineación (openspec: add-artist-lineup-data), con la misma request.

/** Vigencia de la ficha y del enriquecimiento de Wikimedia. */
export const ARTIST_PROFILE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

type Executor = Pick<typeof db, "update" | "delete" | "insert">;

/** Nunca sincronizada o con más de 30 días. */
export function isStale(syncedAt: Date | null, now = Date.now()): boolean {
  return syncedAt === null || now - syncedAt.getTime() > ARTIST_PROFILE_REFRESH_MS;
}

/** Escribe la ficha y reemplaza los enlaces curados del artista. */
export async function saveArtistProfileFacts(
  executor: Executor,
  artistId: string,
  facts: ArtistProfileFacts,
  now = new Date(),
): Promise<void> {
  const { links, ...columns } = facts;
  await executor.update(artist).set({ ...columns, profileSyncedAt: now }).where(eq(artist.id, artistId));
  await executor.delete(artistLink).where(eq(artistLink.artistId, artistId));
  if (links.length > 0) {
    await executor.insert(artistLink).values(links.map((link) => ({ artistId, ...link })));
  }
}

export type ArtistProfileSyncResult = { status: "skipped" } | { status: "synced"; facts: ArtistProfileFacts };

/** La ficha tiene más de 30 días o nunca se sincronizó, o la alineación nunca se guardó con períodos. */
export function needsFactsRefresh(target: Pick<ArtistRow, "profileSyncedAt" | "lineupSyncedAt">): boolean {
  return isStale(target.profileSyncedAt) || target.lineupSyncedAt === null;
}

/**
 * Actualiza la ficha y la alineación (pertenencias con períodos y músicos de apoyo) de un
 * artista con una sola request. La request sale fuera de toda transacción y la escritura va en
 * una transacción corta con el candado por artista, que relee la vigencia (ADR 0063): dos
 * visitas simultáneas del proceso comparten la ejecución y, entre procesos, la tardía no escribe.
 */
export function syncArtistProfileFacts(
  artistId: string,
  { dryRun = false, force = false }: { dryRun?: boolean; force?: boolean } = {},
): Promise<ArtistProfileSyncResult> {
  return singleFlight(`artist-profile:${artistId}:${dryRun}:${force}`, () => runProfileSync(artistId, dryRun, force));
}

async function runProfileSync(artistId: string, dryRun: boolean, force: boolean): Promise<ArtistProfileSyncResult> {
  const [before] = await db.select().from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!before?.mbid) return { status: "skipped" };
  if (!force && !needsFactsRefresh(before)) return { status: "skipped" };
  const mbid = before.mbid;

  const detail = await musicbrainz.getArtistWithRelations(mbid);
  const facts = mapArtistProfileFacts(detail);
  if (dryRun) return { status: "synced", facts };

  return withEntityLock(`artist-profile:${artistId}`, async (tx): Promise<ArtistProfileSyncResult> => {
    const [current] = await tx.select().from(artist).where(eq(artist.id, artistId)).limit(1);
    if (!current || current.mbid !== mbid) return { status: "skipped" };
    // Otro proceso la renovó mientras se esperaba a MusicBrainz.
    if (!force && !needsFactsRefresh(current)) return { status: "skipped" };
    await saveArtistProfileFacts(tx, artistId, facts);
    await saveArtistLineup(tx, current, detail);
    // Un stub (`unknown`) toma su tipo real de la misma respuesta, sin otra request: el lugar
    // de Wikimedia depende de si es persona (nacimiento) o grupo (formación).
    if (current.type === "unknown" && detail.type) {
      await tx.update(artist).set({ type: mapArtistType(detail.type) }).where(eq(artist.id, artistId));
    }
    return { status: "synced", facts };
  });
}

/** La ficha, la alineación o el enriquecimiento de Wikimedia del artista están pendientes o vencidos. */
export function needsProfileRefresh(
  target: Pick<ArtistRow, "mbid" | "profileSyncedAt" | "lineupSyncedAt" | "wikimediaSyncedAt">,
): boolean {
  return target.mbid !== null && (needsFactsRefresh(target) || isStale(target.wikimediaSyncedAt));
}
