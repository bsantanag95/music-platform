// Sincronización del calendario de lanzamientos de Inicio (openspec: add-home-release-calendar,
// ADR 0029). Baja la ventana del feed "Fresh Releases" de ListenBrainz, la filtra, le suma la
// popularidad de los artistas, verifica en MusicBrainz solo los finalistas, vincula al catálogo
// solo lo que se muestra y reemplaza la ventana completa en `release_calendar_entry`.
//
// Las requests externas ocurren fuera de toda transacción: si alguna falla, el calendario
// anterior queda intacto y la sincronización se registra como `failed`.

import { after } from "next/server";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  releaseCalendarEntry,
  releaseCalendarSync,
  releaseGroup,
  type ReleaseCalendarEntryRow,
  type ReleaseGroupRow,
} from "@/db/schema";
import { listenbrainz, FRESH_RELEASES_MAX_DAYS } from "../listenbrainz/client";
import { musicbrainz, RELEASE_GROUP_MBID_BATCH } from "../musicbrainz/client";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import type { MBReleaseGroupSearchItem } from "../musicbrainz/types";
import { findOrResolveCover } from "../catalog/cover";
import { requestDiscographyRefreshes } from "../catalog/discography-refresh-requests";
import { ingestCredits } from "../catalog/ingest-discography";
import { upsertReleaseGroupStubs } from "../catalog/ingest-release-group";
import {
  PAST_DAYS,
  FUTURE_DAYS,
  classifyVerification,
  communityBoost,
  filterFeed,
  isoDay,
  selectAnonymous,
  type CalendarCandidate,
  type RankCandidate,
} from "./release-calendar";
import { relatedArtistMbidsOfAnyUser } from "./release-calendar-relations";

/** Vigencia de una sincronización exitosa. */
export const CALENDAR_TTL_MS = 24 * 60 * 60 * 1000;
/** Una sincronización `running` más vieja que esto se da por muerta (proceso cortado). */
const RUNNING_STALE_MS = 15 * 60 * 1000;
/** Una verificación más vieja que esto se repite (las fechas futuras se corren). */
const VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Tope de discos de artistas con relación que se verifican y vinculan por sincronización. */
const RELATED_LINK_CAP = 150;
/** Vueltas de selección → verificación → carátula antes de rendirse. */
const MAX_SELECTION_ROUNDS = 5;
/** Resoluciones de carátula en paralelo (Cover Art Archive, sin la cola de MusicBrainz). */
const COVER_CONCURRENCY = 4;
const INSERT_CHUNK = 500;
const LOCK_KEY = "release-calendar";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Literal de arreglo `uuid[]` para SQL crudo; descarta lo que no es UUID. */
export function uuidArrayLiteral(ids: Iterable<string>): string {
  return `{${[...ids].filter((id) => UUID_RE.test(id)).join(",")}}`;
}

export type SyncResult =
  | { status: "skipped" }
  | { status: "succeeded"; entries: number; anonymous: number; linked: number; refreshRequests: number }
  | { status: "failed"; error: string };

/** Abre una sincronización si no hay otra en curso. Devuelve su id o `null`. */
async function claimSync(): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${LOCK_KEY}, 0))`);
    const cutoff = new Date(Date.now() - RUNNING_STALE_MS);
    const [running] = await tx
      .select({ id: releaseCalendarSync.id })
      .from(releaseCalendarSync)
      .where(and(eq(releaseCalendarSync.status, "running"), gt(releaseCalendarSync.startedAt, cutoff)))
      .limit(1);
    if (running) return null;
    const [row] = await tx.insert(releaseCalendarSync).values({}).returning({ id: releaseCalendarSync.id });
    return row!.id;
  });
}

/** Fecha de la última sincronización exitosa, o `null` si nunca hubo. */
export async function lastSuccessfulSyncAt(): Promise<Date | null> {
  const [row] = await db
    .select({ finishedAt: releaseCalendarSync.finishedAt })
    .from(releaseCalendarSync)
    .where(eq(releaseCalendarSync.status, "succeeded"))
    .orderBy(desc(releaseCalendarSync.finishedAt))
    .limit(1);
  return row?.finishedAt ?? null;
}

interface ArtistSignals {
  signals: number;
  family: string | null;
}

/** Señales de comunidad y familia de géneros de los artistas del catálogo, por MBID. */
async function artistSignals(mbids: string[]): Promise<Map<string, ArtistSignals>> {
  if (mbids.length === 0) return new Map();
  const rows = await db.execute<{ mbid: string; signals: number; family: string | null }>(sql`
    SELECT a.mbid::text AS mbid,
      (EXISTS (SELECT 1 FROM artist_follow f WHERE f.artist_id = a.id))::int
      + (EXISTS (
          SELECT 1 FROM rating r
          WHERE r.artist_id = a.id
             OR r.release_group_id IN (SELECT c.release_group_id FROM credit c WHERE c.artist_id = a.id AND c.role = 'primary')
             OR r.recording_id IN (SELECT c.recording_id FROM credit c WHERE c.artist_id = a.id AND c.role = 'primary')
        ))::int
      + (EXISTS (
          SELECT 1 FROM listen_entry l
          WHERE l.artist_id = a.id
             OR l.release_group_id IN (SELECT c.release_group_id FROM credit c WHERE c.artist_id = a.id AND c.role = 'primary')
             OR l.recording_id IN (SELECT c.recording_id FROM credit c WHERE c.artist_id = a.id AND c.role = 'primary')
        ))::int AS signals,
      (
        SELECT m.family_key
        FROM artist_genre_seed s
        JOIN genre_family_member m ON m.genre_id = s.genre_id
        JOIN genre_family gf ON gf.key = m.family_key
        WHERE s.artist_id = a.id
        ORDER BY s.position, gf.position
        LIMIT 1
      ) AS family
    FROM artist a
    WHERE a.mbid = ANY(${uuidArrayLiteral(mbids)}::uuid[])
  `);
  return new Map(rows.map((row) => [row.mbid, { signals: Number(row.signals), family: row.family }]));
}

/** Estado acumulado de una entrada durante la sincronización. */
interface WorkingEntry extends CalendarCandidate {
  listeners: number | null;
  verifiedAt: Date | null;
  firstReleaseDate: string | null;
  exclusion: "secondary_type" | "reissue" | null;
  releaseGroupId: string | null;
  anonymousRank: number | null;
  /** Fecha del feed en la sincronización anterior (para detectar fechas corridas). */
  previousReleaseDate: string | null;
}

function needsVerification(entry: WorkingEntry, now: number): boolean {
  if (!entry.verifiedAt) return true;
  if (now - entry.verifiedAt.getTime() > VERIFICATION_TTL_MS) return true;
  return entry.previousReleaseDate !== null && entry.previousReleaseDate !== entry.releaseDate;
}

/**
 * Sincroniza el calendario. Devuelve `skipped` si otra sincronización está en curso. Nunca lanza:
 * un fallo queda registrado y el calendario anterior se conserva.
 */
export async function syncReleaseCalendar(options: { today?: string } = {}): Promise<SyncResult> {
  const syncId = await claimSync();
  if (!syncId) return { status: "skipped" };

  try {
    const result = await runSync(options.today ?? isoDay(new Date()));
    await db
      .update(releaseCalendarSync)
      .set({ status: "succeeded", finishedAt: new Date(), entryCount: result.entries })
      .where(eq(releaseCalendarSync.id, syncId));
    return { status: "succeeded", ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[release-calendar] la sincronización falló", error);
    await db
      .update(releaseCalendarSync)
      .set({ status: "failed", finishedAt: new Date(), error: message.slice(0, 1000) })
      .where(eq(releaseCalendarSync.id, syncId));
    return { status: "failed", error: message };
  }
}

async function runSync(
  today: string,
): Promise<{ entries: number; anonymous: number; linked: number; refreshRequests: number }> {
  const now = Date.now();

  // 1. Feed: pasado y futuro por separado (cada lado tiene su máximo de días).
  const [past, future] = [
    await listenbrainz.freshReleases({ pivot: today, days: PAST_DAYS, past: true, future: false }),
    await listenbrainz.freshReleases({
      pivot: today,
      days: Math.min(FUTURE_DAYS, FRESH_RELEASES_MAX_DAYS),
      past: false,
      future: true,
    }),
  ];
  const candidates = filterFeed([...past, ...future], today);

  // 2. Popularidad de los artistas de los discos con carátula (los únicos que entran a la
  //    selección anónima).
  const withCover = candidates.filter((c) => c.hasCover);
  const popularity = await listenbrainz.artistPopularity(withCover.flatMap((c) => c.artistMbids));
  const listenersByArtist = new Map(popularity.map((p) => [p.artist_mbid, p.total_user_count ?? 0]));

  // 3. Lo que ya se sabía de cada disco (verificación y vínculo) se conserva.
  const previous = new Map<string, ReleaseCalendarEntryRow>(
    (await db.select().from(releaseCalendarEntry)).map((row) => [row.releaseGroupMbid, row]),
  );
  const entries = new Map<string, WorkingEntry>(
    candidates.map((c) => {
      const prev = previous.get(c.releaseGroupMbid);
      const listeners = c.hasCover
        ? Math.max(0, ...c.artistMbids.map((mbid) => listenersByArtist.get(mbid) ?? 0))
        : null;
      return [
        c.releaseGroupMbid,
        {
          ...c,
          listeners,
          verifiedAt: prev?.verifiedAt ?? null,
          firstReleaseDate: prev?.firstReleaseDate ?? null,
          exclusion: prev?.exclusion ?? null,
          releaseGroupId: prev?.releaseGroupId ?? null,
          anonymousRank: null,
          previousReleaseDate: prev?.releaseDate ?? null,
        },
      ];
    }),
  );

  // 4. Señales de comunidad y familia de géneros, para el ranking anónimo.
  const signals = await artistSignals([...new Set(withCover.flatMap((c) => c.artistMbids))]);

  const mbItems = new Map<string, MBReleaseGroupSearchItem>();
  const notFound = new Set<string>();
  const noCover = new Set<string>();
  const nowDate = new Date(now);

  async function verify(targets: WorkingEntry[]): Promise<void> {
    const pending = targets.filter((e) => !mbItems.has(e.releaseGroupMbid) && !notFound.has(e.releaseGroupMbid));
    for (let i = 0; i < pending.length; i += RELEASE_GROUP_MBID_BATCH) {
      const batch = pending.slice(i, i + RELEASE_GROUP_MBID_BATCH);
      const response = await musicbrainz.searchReleaseGroupsByMbid(batch.map((e) => e.releaseGroupMbid));
      const byId = new Map((response["release-groups"] ?? []).map((item) => [item.id, item]));
      for (const entry of batch) {
        const item = byId.get(entry.releaseGroupMbid);
        if (!item) {
          notFound.add(entry.releaseGroupMbid);
          continue;
        }
        mbItems.set(entry.releaseGroupMbid, item);
        const verdict = classifyVerification(item, entry.releaseDate, today);
        entry.verifiedAt = nowDate;
        entry.firstReleaseDate = verdict.firstReleaseDate;
        entry.exclusion = verdict.status === "valid" ? null : verdict.status;
      }
    }
  }

  /** Vincula al catálogo (stub + créditos) las entradas válidas que aún no lo están. */
  async function link(targets: WorkingEntry[]): Promise<void> {
    const unlinked = targets.filter((e) => !e.releaseGroupId && !e.exclusion);
    if (unlinked.length === 0) return;
    const existing = await db
      .select({ id: releaseGroup.id, mbid: releaseGroup.mbid })
      .from(releaseGroup)
      .where(inArray(releaseGroup.mbid, unlinked.map((e) => e.releaseGroupMbid)));
    const existingByMbid = new Map(existing.map((row) => [row.mbid, row.id]));
    const toCreate = unlinked.filter((e) => !existingByMbid.has(e.releaseGroupMbid) && mbItems.has(e.releaseGroupMbid));
    const created = await upsertReleaseGroupStubs(
      toCreate.map((e) => {
        const item = mbItems.get(e.releaseGroupMbid)!;
        return {
          mbid: e.releaseGroupMbid,
          title: item.title,
          category: mapReleaseGroupCategory(item["primary-type"], item["secondary-types"]),
          firstReleaseDate: item["first-release-date"],
        };
      }),
    );
    for (const row of created) {
      const item = row.mbid ? mbItems.get(row.mbid) : undefined;
      if (item?.["artist-credit"]?.length) await ingestCredits(item["artist-credit"], { releaseGroupId: row.id });
      existingByMbid.set(row.mbid, row.id);
    }
    for (const entry of unlinked) entry.releaseGroupId = existingByMbid.get(entry.releaseGroupMbid) ?? null;
  }

  /** Resuelve la carátula por el pipeline existente; las que CAA no confirma salen de la selección. */
  async function resolveCovers(targets: WorkingEntry[]): Promise<void> {
    const ids = targets.map((e) => e.releaseGroupId).filter((id): id is string => id !== null);
    if (ids.length === 0) return;
    const rows = await db.select().from(releaseGroup).where(inArray(releaseGroup.id, ids));
    const byId = new Map<string, ReleaseGroupRow>(rows.map((row) => [row.id, row]));
    const queue = [...targets];
    const worker = async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        const row = entry.releaseGroupId ? byId.get(entry.releaseGroupId) : undefined;
        const cover = row ? await findOrResolveCover(row) : null;
        if (!cover) noCover.add(entry.releaseGroupMbid);
      }
    };
    await Promise.all(Array.from({ length: COVER_CONCURRENCY }, worker));
  }

  // 5. Selección anónima: elegir → verificar → vincular → carátula, hasta que lo elegido sea
  //    todo válido o se agoten las vueltas.
  let selection: RankCandidate[] = [];
  for (let round = 0; round < MAX_SELECTION_ROUNDS; round++) {
    const pool: RankCandidate[] = [...entries.values()]
      .filter(
        (e) =>
          e.hasCover &&
          !noCover.has(e.releaseGroupMbid) &&
          !notFound.has(e.releaseGroupMbid) &&
          !(e.exclusion && !needsVerification(e, now)),
      )
      .map((e) => {
        const artistSignal = e.artistMbids.map((mbid) => signals.get(mbid)).find((s) => s !== undefined);
        return {
          releaseGroupMbid: e.releaseGroupMbid,
          releaseDate: e.releaseDate,
          artistMbids: e.artistMbids,
          listeners: e.listeners ?? 0,
          communityBoost: communityBoost(artistSignal?.signals ?? 0),
          family: artistSignal?.family ?? null,
        };
      });
    selection = selectAnonymous(pool, today);
    const chosen = selection.map((s) => entries.get(s.releaseGroupMbid)!);

    await verify(chosen.filter((e) => needsVerification(e, now) || (!e.releaseGroupId && !mbItems.has(e.releaseGroupMbid))));
    await link(chosen);
    await resolveCovers(chosen.filter((e) => !e.exclusion && e.releaseGroupId));

    const ok = chosen.every(
      (e) => !e.exclusion && e.releaseGroupId && !noCover.has(e.releaseGroupMbid) && !notFound.has(e.releaseGroupMbid),
    );
    if (ok) break;
  }
  const finalSelection = selection.filter((s) => {
    const e = entries.get(s.releaseGroupMbid)!;
    return !e.exclusion && e.releaseGroupId && !noCover.has(e.releaseGroupMbid) && !notFound.has(e.releaseGroupMbid);
  });
  finalSelection.forEach((s, i) => {
    entries.get(s.releaseGroupMbid)!.anonymousRank = i + 1;
  });

  // 6. Discos de artistas con los que algún usuario tiene relación: se verifican y vinculan para
  //    que la selección personal (por request) tenga página y fecha verificada.
  const related = new Set(await relatedArtistMbidsOfAnyUser());
  const relatedEntries = [...entries.values()]
    .filter((e) => e.artistMbids.some((mbid) => related.has(mbid)))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(0, RELATED_LINK_CAP);
  await verify(relatedEntries.filter((e) => needsVerification(e, now) || (!e.releaseGroupId && !mbItems.has(e.releaseGroupMbid))));
  await link(relatedEntries);
  await resolveCovers(relatedEntries.filter((e) => e.hasCover && !e.exclusion && e.releaseGroupId));

  // 7. Reemplazo transaccional de la ventana completa.
  const rows = [...entries.values()].map((e) => ({
    releaseGroupMbid: e.releaseGroupMbid,
    releaseMbid: e.releaseMbid,
    title: e.title,
    artistCreditName: e.artistCreditName,
    artistMbids: e.artistMbids,
    releaseDate: e.releaseDate,
    primaryType: e.primaryType,
    hasCover: e.hasCover,
    artistListeners: e.listeners,
    verifiedAt: e.verifiedAt,
    firstReleaseDate: e.firstReleaseDate,
    exclusion: e.exclusion,
    releaseGroupId: e.releaseGroupId,
    anonymousRank: e.anonymousRank,
    syncedAt: nowDate,
  }));
  await db.transaction(async (tx) => {
    await tx.delete(releaseCalendarEntry);
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      await tx.insert(releaseCalendarEntry).values(rows.slice(i, i + INSERT_CHUNK));
    }
  });

  // 8. Artistas con discografía guardada a los que les falta un disco del calendario: su próxima
  //    visita la resincroniza completa (openspec: refresh-discography-on-new-releases). Nunca lanza.
  const refreshRequests = await requestDiscographyRefreshes();

  return {
    entries: rows.length,
    anonymous: finalSelection.length,
    linked: rows.filter((r) => r.releaseGroupId).length,
    refreshRequests,
  };
}

/** `true` si el calendario no tiene una sincronización exitosa en las últimas 24 h. */
export async function isReleaseCalendarStale(): Promise<boolean> {
  const last = await lastSuccessfulSyncAt();
  return !last || Date.now() - last.getTime() > CALENDAR_TTL_MS;
}

/**
 * Programa la sincronización después de responder si el calendario está vencido o vacío. Fuera
 * de una request de Next (scripts, tests) `after()` no está disponible: se omite. Sin
 * `LISTENBRAINZ_USER_AGENT` no se programa nada (el cliente fallaría cerrado de todos modos).
 */
export async function ensureReleaseCalendarFresh(): Promise<void> {
  if (!process.env.LISTENBRAINZ_USER_AGENT) return;
  try {
    if (!(await isReleaseCalendarStale())) return;
  } catch (error) {
    // Inicio nunca falla por el calendario: sin poder leer su estado, no se programa nada.
    console.error("[release-calendar] no se pudo leer el estado de la sincronización", error);
    return;
  }
  try {
    after(() => syncReleaseCalendar().then(() => undefined));
  } catch {
    console.warn("[release-calendar] sincronización omitida: fuera de una request");
  }
}
