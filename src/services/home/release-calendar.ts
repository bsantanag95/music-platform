// Reglas puras del calendario de lanzamientos de Inicio (openspec: add-home-release-calendar):
// ventanas de fechas, filtro del feed de ListenBrainz, clasificación de la verificación en
// MusicBrainz y selección anónima. Sin base ni red: la orquestación vive en
// `release-calendar-sync.ts` y la lectura en `release-calendar-read.ts`.

import type { LBFreshRelease } from "../listenbrainz/client";
import type { MBReleaseGroupSearchItem } from "../musicbrainz/types";
import { normalizeReleaseDate } from "../musicbrainz/mappers";

/** Días hacia atrás que cubre el calendario (y el lado "recientes" del riel). */
export const PAST_DAYS = 30;
/** Días hacia adelante que guarda el calendario (máximo del feed). */
export const FUTURE_DAYS = 90;
/** Próximos de la selección anónima; se amplía a `FUTURE_DAYS` si quedan pocos. */
export const ANONYMOUS_UPCOMING_DAYS = 60;
/** Bajo este mínimo de próximos, la selección anónima amplía su ventana. */
export const ANONYMOUS_MIN_PER_SIDE = 4;
/** Discos por lado de la selección anónima. */
export const ANONYMOUS_PER_SIDE = 12;
/** Tope de discos de una misma familia de géneros por lado. */
export const ANONYMOUS_FAMILY_CAP = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` en UTC. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Suma días a un `YYYY-MM-DD`. */
export function addDays(day: string, days: number): string {
  return isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

/** Fila del calendario lista para guardar, antes de la verificación. */
export interface CalendarCandidate {
  releaseGroupMbid: string;
  releaseMbid: string | null;
  title: string;
  artistCreditName: string;
  artistMbids: string[];
  releaseDate: string;
  primaryType: "Album" | "EP";
  hasCover: boolean;
}

/**
 * Filtro local del feed: fecha exacta al día dentro de la ventana, tipo Álbum o EP, una fila por
 * release-group (el feed ya viene así; se deduplica por si las dos consultas se solapan en el día
 * pivote). La carátula no filtra aquí: un disco sin carátula sirve para la marca "Anunciado".
 */
export function filterFeed(rows: LBFreshRelease[], today: string): CalendarCandidate[] {
  const from = addDays(today, -PAST_DAYS);
  const to = addDays(today, FUTURE_DAYS);
  const byMbid = new Map<string, CalendarCandidate>();
  for (const row of rows) {
    const date = normalizeReleaseDate(row.release_date);
    if (!date || date < from || date > to) continue;
    const type = row.release_group_primary_type;
    if (type !== "Album" && type !== "EP") continue;
    if (!row.release_group_mbid || byMbid.has(row.release_group_mbid)) continue;
    byMbid.set(row.release_group_mbid, {
      releaseGroupMbid: row.release_group_mbid,
      releaseMbid: row.release_mbid || null,
      title: row.release_name,
      artistCreditName: row.artist_credit_name,
      artistMbids: row.artist_mbids ?? [],
      releaseDate: date,
      primaryType: type,
      hasCover: row.caa_id !== null && row.caa_id !== undefined,
    });
  }
  return [...byMbid.values()];
}

export type Verification =
  | { status: "valid"; firstReleaseDate: string }
  | { status: "secondary_type" | "reissue"; firstReleaseDate: string | null };

/**
 * Clasifica un finalista con el release-group que devolvió MusicBrainz: con tipos secundarios
 * (en vivo, recopilatorio, banda sonora, remix…) queda excluido; si salió por primera vez antes
 * de la ventana es una reedición. Sin `first-release-date` exacta se toma la fecha del feed.
 */
export function classifyVerification(
  item: MBReleaseGroupSearchItem,
  feedDate: string,
  today: string,
): Verification {
  const exact = normalizeReleaseDate(item["first-release-date"]);
  if ((item["secondary-types"] ?? []).length > 0) {
    return { status: "secondary_type", firstReleaseDate: exact };
  }
  const windowStart = addDays(today, -PAST_DAYS);
  // Año o año-mes solamente: se compara el prefijo contra el inicio de la ventana.
  const partial = item["first-release-date"];
  if (exact ? exact < windowStart : partial ? partial < windowStart.slice(0, partial.length) : false) {
    return { status: "reissue", firstReleaseDate: exact };
  }
  return { status: "valid", firstReleaseDate: exact ?? feedDate };
}

/** Candidato de la selección anónima. */
export interface RankCandidate {
  releaseGroupMbid: string;
  releaseDate: string;
  artistMbids: string[];
  listeners: number;
  /** Impulso por actividad en la comunidad propia (0–2). */
  communityBoost: number;
  /** Familia de géneros del artista principal, si se conoce. */
  family: string | null;
}

export function anonymousScore(candidate: Pick<RankCandidate, "listeners" | "communityBoost">): number {
  return Math.log10(1 + Math.max(0, candidate.listeners)) + candidate.communityBoost;
}

/**
 * Impulso por comunidad: +1 si el artista tiene alguna señal (seguidores, valoraciones,
 * escuchas) y +0,5 por cada señal adicional, con tope de 2.
 */
export function communityBoost(signals: number): number {
  if (signals <= 0) return 0;
  return Math.min(2, 1 + 0.5 * (signals - 1));
}

function pickSide(
  candidates: RankCandidate[],
  usedArtists: Set<string>,
): RankCandidate[] {
  const picked: RankCandidate[] = [];
  const perFamily = new Map<string, number>();
  const sorted = [...candidates].sort(
    (a, b) => anonymousScore(b) - anonymousScore(a) || a.releaseDate.localeCompare(b.releaseDate),
  );
  for (const candidate of sorted) {
    if (picked.length >= ANONYMOUS_PER_SIDE) break;
    if (candidate.artistMbids.some((mbid) => usedArtists.has(mbid))) continue;
    if (candidate.family && (perFamily.get(candidate.family) ?? 0) >= ANONYMOUS_FAMILY_CAP) continue;
    picked.push(candidate);
    candidate.artistMbids.forEach((mbid) => usedArtists.add(mbid));
    if (candidate.family) perFamily.set(candidate.family, (perFamily.get(candidate.family) ?? 0) + 1);
  }
  return picked;
}

/**
 * Selección anónima: hasta 12 recientes (hoy incluido) y 12 próximos por relevancia, un disco
 * por artista en todo el riel y como máximo 3 por familia de géneros por lado. Si los próximos a
 * 60 días son menos de 4, la ventana se amplía a 90. Devuelve el orden final (recientes primero,
 * luego próximos, cada lado por relevancia): es el `anonymous_rank`.
 */
export function selectAnonymous(candidates: RankCandidate[], today: string): RankCandidate[] {
  const from = addDays(today, -PAST_DAYS);
  const recent = candidates.filter((c) => c.releaseDate >= from && c.releaseDate <= today);
  const upcomingIn = (days: number) =>
    candidates.filter((c) => c.releaseDate > today && c.releaseDate <= addDays(today, days));

  const usedArtists = new Set<string>();
  const pickedRecent = pickSide(recent, usedArtists);

  let upcomingArtists = new Set(usedArtists);
  let pickedUpcoming = pickSide(upcomingIn(ANONYMOUS_UPCOMING_DAYS), upcomingArtists);
  if (pickedUpcoming.length < ANONYMOUS_MIN_PER_SIDE) {
    upcomingArtists = new Set(usedArtists);
    pickedUpcoming = pickSide(upcomingIn(FUTURE_DAYS), upcomingArtists);
  }
  return [...pickedRecent, ...pickedUpcoming];
}
