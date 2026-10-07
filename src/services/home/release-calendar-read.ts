// Lectura del calendario de lanzamientos para el riel de Inicio (openspec:
// add-home-release-calendar). La selección anónima ya viene ordenada de la sincronización
// (`anonymous_rank`); la personal se calcula por request a partir de la relación de la persona
// con artistas.

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { releaseCalendarEntry, releaseGroup } from "@/db/schema";
import { addDays, isoDay, PAST_DAYS, FUTURE_DAYS } from "./release-calendar";
import { relatedArtistsOfUser } from "./release-calendar-relations";
import { uuidArrayLiteral } from "./release-calendar-sync";
import type { HomeRelease } from "./home";

/** Discos del riel personal. */
export const PERSONAL_LIMIT = 20;
/** Bajo este mínimo, el riel personal se completa con la selección anónima. */
export const PERSONAL_MIN = 6;
/** Horizonte de los próximos personales (más allá de la ventana del feed sale del catálogo). */
export const PERSONAL_UPCOMING_DAYS = 180;

function section(date: string, today: string): HomeRelease["section"] {
  return date <= today ? "recent" : "upcoming";
}

/** Selección anónima: hasta 24 discos con carátula, en el orden de la sincronización. */
export async function listAnonymousReleases(today = isoDay(new Date())): Promise<HomeRelease[]> {
  const rows = await db
    .select({
      id: releaseGroup.id,
      title: releaseCalendarEntry.title,
      artist: releaseCalendarEntry.artistCreditName,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      releaseDate: releaseCalendarEntry.releaseDate,
      firstReleaseDate: releaseCalendarEntry.firstReleaseDate,
    })
    .from(releaseCalendarEntry)
    .innerJoin(releaseGroup, eq(releaseGroup.id, releaseCalendarEntry.releaseGroupId))
    .where(
      and(
        isNotNull(releaseCalendarEntry.anonymousRank),
        isNotNull(releaseGroup.coverThumbUrl),
        isNull(releaseGroup.coverBlockedAt),
        sql`COALESCE(${releaseCalendarEntry.firstReleaseDate}, ${releaseCalendarEntry.releaseDate}) >= ${addDays(today, -PAST_DAYS)}::date`,
      ),
    )
    .orderBy(asc(releaseCalendarEntry.anonymousRank));

  return rows.map((row) => {
    const date = row.firstReleaseDate ?? row.releaseDate;
    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      coverThumbUrl: row.coverThumbUrl,
      releaseDate: date,
      section: section(date, today),
      badge: null,
    };
  });
}

interface PersonalCandidate {
  release: HomeRelease;
  weight: number;
}

/**
 * Selección personal: discos de artistas con los que la persona tiene relación (últimos 30 días
 * y próximos hasta 180), hasta 20, ordenados por el peso de la relación y la cercanía a hoy. Un
 * disco sin carátula solo entra si la persona sigue al artista (marca "Anunciado"). Bajo 6 se
 * completa con la selección anónima (marca "Destacado").
 */
export async function listPersonalReleases(userId: string, today = isoDay(new Date())): Promise<HomeRelease[]> {
  const related = await relatedArtistsOfUser(userId);
  const anonymous = () => listAnonymousReleases(today);
  if (related.length === 0) {
    return (await anonymous()).map((release) => ({ ...release, badge: "featured" as const }));
  }

  const byMbid = new Map(related.map((artist) => [artist.mbid, artist]));
  const byId = new Map(related.map((artist) => [artist.artistId, artist]));
  const from = addDays(today, -PAST_DAYS);

  // Del calendario: verificados, vinculados y no excluidos.
  const calendarRows = await db.execute<{
    id: string;
    mbid: string;
    title: string;
    artist: string;
    cover: string | null;
    blocked: boolean;
    date: string;
    artist_mbids: string[];
  }>(sql`
    SELECT rg.id, rg.mbid::text AS mbid, e.title, e.artist_credit_name AS artist,
           rg.cover_thumb_url AS cover, rg.cover_blocked_at IS NOT NULL AS blocked,
           COALESCE(e.first_release_date, e.release_date)::text AS date,
           e.artist_mbids::text[] AS artist_mbids
    FROM release_calendar_entry e
    JOIN release_group rg ON rg.id = e.release_group_id
    WHERE e.artist_mbids && ${uuidArrayLiteral(byMbid.keys())}::uuid[]
      AND e.verified_at IS NOT NULL
      AND e.exclusion IS NULL
      AND COALESCE(e.first_release_date, e.release_date) BETWEEN ${from}::date AND ${addDays(today, FUTURE_DAYS)}::date
  `);

  // Del catálogo: anunciados más allá de la ventana del feed (discografías ya sincronizadas).
  const catalogRows = await db.execute<{
    id: string;
    mbid: string;
    title: string;
    artist: string;
    artist_id: string;
    cover: string | null;
    blocked: boolean;
    date: string;
  }>(sql`
    SELECT rg.id, rg.mbid::text AS mbid, rg.title, a.name AS artist, a.id AS artist_id,
           rg.cover_thumb_url AS cover, rg.cover_blocked_at IS NOT NULL AS blocked,
           rg.first_release_date::text AS date
    FROM release_group rg
    JOIN credit c ON c.release_group_id = rg.id AND c.role = 'primary'
    JOIN artist a ON a.id = c.artist_id
    WHERE c.artist_id = ANY(${uuidArrayLiteral(byId.keys())}::uuid[])
      AND rg.first_release_date > ${today}::date
      AND rg.first_release_date <= ${addDays(today, PERSONAL_UPCOMING_DAYS)}::date
      AND rg.discography_unlisted_at IS NULL
      AND COALESCE(cardinality(rg.secondary_types), 0) = 0
      AND (rg.primary_type IN ('Album', 'EP') OR (rg.primary_type IS NULL AND rg.category = 'studio'))
  `);

  const candidates = new Map<string, PersonalCandidate>();
  const consider = (row: {
    id: string;
    title: string;
    artist: string;
    cover: string | null;
    blocked: boolean;
    date: string;
    weight: number;
    follows: boolean;
  }) => {
    if (candidates.has(row.id)) return;
    const cover = row.blocked ? null : row.cover;
    // Sin carátula solo entra lo de artistas seguidos, como "Anunciado".
    if (!cover && !row.follows) return;
    candidates.set(row.id, {
      release: {
        id: row.id,
        title: row.title,
        artist: row.artist,
        coverThumbUrl: cover,
        releaseDate: row.date,
        section: section(row.date, today),
        badge: cover ? null : "announced",
      },
      weight: row.weight,
    });
  };

  for (const row of calendarRows) {
    const artists = row.artist_mbids.map((mbid) => byMbid.get(mbid)).filter((a) => a !== undefined);
    consider({
      ...row,
      weight: Math.max(0, ...artists.map((a) => a.weight)),
      follows: artists.some((a) => a.follows),
    });
  }
  for (const row of catalogRows) {
    const artist = byId.get(row.artist_id);
    consider({ ...row, weight: artist?.weight ?? 0, follows: artist?.follows ?? false });
  }

  const distance = (date: string) => Math.abs(Date.parse(date) - Date.parse(today));
  const personal: HomeRelease[] = [...candidates.values()]
    .sort((a, b) => b.weight - a.weight || distance(a.release.releaseDate) - distance(b.release.releaseDate))
    .slice(0, PERSONAL_LIMIT)
    .map((candidate) => candidate.release);

  if (personal.length >= PERSONAL_MIN) return personal;

  const taken = new Set(personal.map((release) => release.id));
  const fill = (await anonymous())
    .filter((release) => !taken.has(release.id))
    .slice(0, PERSONAL_LIMIT - personal.length)
    .map((release) => ({ ...release, badge: "featured" as const }));
  return [...personal, ...fill];
}
