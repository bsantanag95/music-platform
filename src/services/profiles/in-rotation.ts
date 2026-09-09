import { cache } from "react";
import { and, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { listenEntry, recording, release, releaseGroup, track } from "@/db/schema";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";

// "En rotación" — sección de perfil derivada SOLO del diario (`listen_entry`).
// Nunca lee valoraciones, favoritos ni reseñas: una reacción dice "me gusta",
// no "lo estoy escuchando ahora" (openspec: add-profile-in-rotation, D1). El
// módulo no importa `rating` / `favorite` / `review` a propósito.
//
// Arquitectura `señales → score → estado`: el cálculo es un puntaje sobre
// eventos crudos de escucha, no un umbral hard-codeado, para poder calibrar
// los números con datos reales sin migrar (D2). Cálculo bajo demanda, sin
// tabla materializada (mismo patrón que `taste-fingerprint`).

export const ROTATION_WINDOW_DAYS = 30;
/** Peso por tramo de recencia: 0–7 d / 8–21 d / 22–30 d. */
export const RECENCY_WEIGHTS = { current: 3, recent: 2, residual: 1 } as const;
/** Un registro explícito de álbum pesa más que una escucha de canción suelta. */
export const ALBUM_LISTEN_MULTIPLIER = 2;
/** Aporte plano de cada canción distinta al score de su álbum (roll-up). */
export const ROLLUP_SONG_WEIGHT = 1;
/** Score mínimo para aparecer en la sección. */
export const ROTATION_SCORE_THRESHOLD = 3;
/** Máximo de entidades por bloque (canciones / álbumes). */
export const ROTATION_MAX_PER_TYPE = 8;

const DAY_MS = 86_400_000;

export interface InRotationSong {
  id: string;
  title: string;
  artistName: string | null;
}

export interface InRotationAlbum {
  id: string;
  title: string;
  artistName: string | null;
  coverThumbUrl: string | null;
}

export interface InRotation {
  songs: InRotationSong[];
  albums: InRotationAlbum[];
}

interface Acc {
  score: number;
  latestAt: number;
}

// Artista principal acreditado, como subquery escalar correlacionada (no
// multiplica filas). Mismo criterio que `PRIMARY_ARTIST_SQL` del feed. La
// correlación se escribe con el nombre de tabla explícito (`"recording"."id"`)
// porque estas constantes viven a nivel de módulo, fuera del contexto del
// query builder que calificaría la columna sola.
const RECORDING_ARTIST = sql<string | null>`(
  SELECT a.name FROM credit c
  JOIN artist a ON a.id = c.artist_id
  WHERE c.recording_id = "recording"."id" AND c.role = 'primary'
  ORDER BY c.position
  LIMIT 1
)`;

const RELEASE_GROUP_ARTIST = sql<string | null>`(
  SELECT a.name FROM credit c
  JOIN artist a ON a.id = c.artist_id
  WHERE c.release_group_id = "release_group"."id" AND c.role = 'primary'
  ORDER BY c.position
  LIMIT 1
)`;

function recencyWeight(createdAt: Date, now: number): number {
  const days = (now - createdAt.getTime()) / DAY_MS;
  if (days <= 7) return RECENCY_WEIGHTS.current;
  if (days <= 21) return RECENCY_WEIGHTS.recent;
  if (days <= ROTATION_WINDOW_DAYS) return RECENCY_WEIGHTS.residual;
  return 0;
}

function bump(acc: Map<string, Acc>, key: string, score: number, at: number): void {
  const cur = acc.get(key) ?? { score: 0, latestAt: 0 };
  cur.score += score;
  cur.latestAt = Math.max(cur.latestAt, at);
  acc.set(key, cur);
}

function rank(acc: Map<string, Acc>): string[] {
  return [...acc.entries()]
    .filter(([, v]) => v.score >= ROTATION_SCORE_THRESHOLD)
    .sort(
      ([aId, a], [bId, b]) =>
        b.score - a.score || b.latestAt - a.latestAt || aId.localeCompare(bId),
    )
    .slice(0, ROTATION_MAX_PER_TYPE)
    .map(([id]) => id);
}

// Desambiguación del roll-up: entre los release-groups de estudio en que
// aparece la canción, el de primer lanzamiento más temprano (fecha, luego
// año, luego id). Clave comparable como string, nulls al final.
function rolloutKey(date: string | null, year: number | null, id: string): string {
  const d = date ?? "9999-99-99";
  const y = String(year ?? 9999).padStart(4, "0");
  return `${d}|${y}|${id}`;
}

async function studioAlbumByRecording(recordingIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (recordingIds.length === 0) return map;

  const rows = await db
    .select({
      recordingId: track.recordingId,
      releaseGroupId: releaseGroup.id,
      firstReleaseDate: releaseGroup.firstReleaseDate,
      firstReleaseYear: releaseGroup.firstReleaseYear,
    })
    .from(track)
    .innerJoin(release, eq(release.id, track.releaseId))
    .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
    .where(
      and(inArray(track.recordingId, recordingIds), eq(releaseGroup.category, "studio")),
    );

  const best = new Map<string, { id: string; key: string }>();
  for (const row of rows) {
    const key = rolloutKey(row.firstReleaseDate, row.firstReleaseYear, row.releaseGroupId);
    const cur = best.get(row.recordingId);
    if (!cur || key < cur.key) best.set(row.recordingId, { id: row.releaseGroupId, key });
  }
  for (const [rid, v] of best) map.set(rid, v.id);
  return map;
}

async function resolveSongs(ids: string[]): Promise<InRotationSong[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: recording.id, title: recording.title, artistName: RECORDING_ARTIST })
    .from(recording)
    .where(inArray(recording.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: InRotationSong[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (r) out.push({ id: r.id, title: r.title, artistName: r.artistName });
  }
  return out;
}

async function resolveAlbums(ids: string[]): Promise<InRotationAlbum[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: releaseGroup.id,
      title: releaseGroup.title,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      artistName: RELEASE_GROUP_ARTIST,
    })
    .from(releaseGroup)
    .where(inArray(releaseGroup.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: InRotationAlbum[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (r) {
      out.push({ id: r.id, title: r.title, artistName: r.artistName, coverThumbUrl: r.coverThumbUrl });
    }
  }
  return out;
}

/**
 * Sección "En rotación" de un perfil para un lector: solo entradas de diario
 * de los últimos 30 días que el lector tiene permitido ver. Devuelve `null`
 * cuando no hay acceso al perfil o cuando ningún bloque alcanza el umbral —
 * en ese caso la sección no se renderiza. Memoizado por request: página y
 * endpoint comparten el resultado.
 */
export const getProfileInRotation = cache(
  async (username: string, viewerId: string | null): Promise<InRotation | null> => {
    const { getProfileByUsername } = await import("@/services/social/profiles");
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return null;

    const audiences = audiencesForProfile(profile) as Audience[];
    if (audiences.length === 0) return null;

    const since = new Date(Date.now() - ROTATION_WINDOW_DAYS * DAY_MS);

    const signals = await db
      .select({
        createdAt: listenEntry.createdAt,
        recordingId: listenEntry.recordingId,
        releaseGroupId: listenEntry.releaseGroupId,
      })
      .from(listenEntry)
      .where(
        and(
          eq(listenEntry.userId, profile.id),
          inArray(listenEntry.audience, audiences),
          gte(listenEntry.createdAt, since),
          or(isNotNull(listenEntry.recordingId), isNotNull(listenEntry.releaseGroupId)),
        ),
      );

    if (signals.length === 0) return null;

    const now = Date.now();

    // --- Score de canciones: todas las escuchas de la canción suman ---
    const songAcc = new Map<string, Acc>();
    for (const s of signals) {
      if (!s.recordingId) continue;
      const w = recencyWeight(s.createdAt, now);
      if (w > 0) bump(songAcc, s.recordingId, w, s.createdAt.getTime());
    }

    // --- Roll-up canción → álbum de estudio ---
    const rollup = await studioAlbumByRecording([...songAcc.keys()]);

    // --- Score de álbumes: (a) señales directas ×mult, (b) roll-up plano ---
    const albumAcc = new Map<string, Acc>();
    for (const s of signals) {
      if (!s.releaseGroupId) continue;
      const w = recencyWeight(s.createdAt, now);
      if (w > 0) {
        bump(albumAcc, s.releaseGroupId, w * ALBUM_LISTEN_MULTIPLIER, s.createdAt.getTime());
      }
    }
    for (const [recordingId, song] of songAcc) {
      const rgId = rollup.get(recordingId);
      if (rgId) bump(albumAcc, rgId, ROLLUP_SONG_WEIGHT, song.latestAt);
    }

    const [songs, albums] = await Promise.all([
      resolveSongs(rank(songAcc)),
      resolveAlbums(rank(albumAcc)),
    ]);

    if (songs.length === 0 && albums.length === 0) return null;
    return { songs, albums };
  },
);
