import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistFollow, favorite } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { addDays, FUTURE_DAYS, isoDay, PAST_DAYS } from "@/services/home/release-calendar";

// Seguir artista — relación unilateral usuario → artista
// (openspec: add-artist-following). Sin aprobación, idempotente en ambos
// sentidos. Distinta de `favorite` de artista (gusto declarado) y de
// `user_follow`. En esta fase: señal de afinidad / descubrimiento /
// organización personal. Sin notificaciones de lanzamiento.

export interface FollowedArtist {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
  /**
   * Faceta de recorrido de artista (openspec: add-artist-journey), solo en la
   * sección "Exploración" del perfil (`listProfileFollowedArtists`). `undefined`
   * cuando el artista no tiene un recorrido propio del dueño, o está
   * archivado — ninguno de los dos casos se representa como "pendiente"
   * (docs/00-product/product_philosophy.md §6.4.1).
   */
  journeyState?: "in_progress" | "complete";
  /** Si el usuario lo marcó como favorito; solo en `listAllFollowedArtists` (menú de `/me/artists`). */
  favorite?: boolean;
}

/** Disco de un artista para `/me/artists`: título, fecha (o solo año) y su página si está en el catálogo. */
export interface FollowedArtistRelease {
  title: string;
  /** `AAAA-MM-DD`; nulo si solo se conoce el año. */
  date: string | null;
  year: number | null;
  releaseGroupId: string | null;
}

/** Artista seguido con lo que necesita la superficie de gestión (openspec: redesign-artists-toolbar). */
export interface ManagedFollowedArtist extends FollowedArtist {
  favorite: boolean;
  followedAt: string;
  /** Novedad del calendario de lanzamientos: anunciado o de los últimos 30 días (D2). */
  news: FollowedArtistRelease | null;
  /** Último disco publicado de su discografía guardada (D3). */
  latestRelease: FollowedArtistRelease | null;
}

async function assertArtistExists(artistId: string): Promise<void> {
  const [row] = await db
    .select({ id: artist.id })
    .from(artist)
    .where(eq(artist.id, artistId))
    .limit(1);
  if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
}

export async function followArtist(
  userId: string,
  artistId: string,
): Promise<{ following: true }> {
  await assertArtistExists(artistId);
  await db
    .insert(artistFollow)
    .values({ userId, artistId })
    .onConflictDoNothing({ target: [artistFollow.userId, artistFollow.artistId] });
  return { following: true };
}

export async function unfollowArtist(
  userId: string,
  artistId: string,
): Promise<{ following: false }> {
  await db
    .delete(artistFollow)
    .where(and(eq(artistFollow.userId, userId), eq(artistFollow.artistId, artistId)));
  return { following: false };
}

export async function isFollowingArtist(
  userId: string,
  artistId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: artistFollow.id })
    .from(artistFollow)
    .where(and(eq(artistFollow.userId, userId), eq(artistFollow.artistId, artistId)))
    .limit(1);
  return Boolean(row);
}

const FOLLOWED_SELECT = {
  id: artist.id,
  name: artist.name,
  type: artist.type,
  photoUrl: artist.photoUrl,
} as const;

export async function listFollowedArtists(
  userId: string,
  page = 1,
  pageSize = 50,
): Promise<{ artists: FollowedArtist[]; page: number; pageSize: number; hasNext: boolean }> {
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const rows = await db
    .select(FOLLOWED_SELECT)
    .from(artistFollow)
    .innerJoin(artist, eq(artist.id, artistFollow.artistId))
    .where(eq(artistFollow.userId, userId))
    .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    artists: rows.slice(0, pageSize),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

/**
 * Todos los artistas que sigue `userId`, del más reciente al más antiguo, con su estado de favorito, la fecha en que los
 * sigue, su novedad del calendario y su último disco: la superficie de gestión `/me/artists` filtra, segmenta y ordena
 * en memoria, así que necesita la lista completa (openspec: refine-artists-page-phase1, D1; redesign-artists-toolbar,
 * D2–D3). Tres consultas en total, nunca una por artista.
 */
export async function listAllFollowedArtists(
  userId: string,
  today: string = isoDay(new Date()),
): Promise<ManagedFollowedArtist[]> {
  const rows = await db
    .select({
      ...FOLLOWED_SELECT,
      mbid: artist.mbid,
      followedAt: artistFollow.createdAt,
      favorite: sql<boolean>`exists (
        select 1 from ${favorite}
        where ${favorite.userId} = ${userId} and ${favorite.artistId} = ${artist.id}
      )`,
    })
    .from(artistFollow)
    .innerJoin(artist, eq(artist.id, artistFollow.artistId))
    .where(eq(artistFollow.userId, userId))
    .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id));
  if (rows.length === 0) return [];

  const [news, latest] = await Promise.all([
    newsByArtist(rows, today),
    latestReleaseByArtist(
      rows.map((row) => row.id),
      today,
    ),
  ]);

  return rows.map(({ id, name, type, photoUrl, favorite, followedAt }) => ({
    id,
    name,
    type,
    photoUrl,
    favorite,
    followedAt: followedAt.toISOString(),
    news: news.get(id) ?? null,
    latestRelease: latest.get(id) ?? null,
  }));
}

function uuidArray(ids: string[]): string {
  return `{${ids.join(",")}}`;
}

/**
 * Novedad por artista desde `release_calendar_entry` (D2): entradas no excluidas con su MBID en `artist_mbids`, entre hoy
 * − 30 días y el fin de la ventana del feed. La próxima por salir y, si no hay, la más reciente.
 */
async function newsByArtist(
  artists: { id: string; mbid: string | null }[],
  today: string,
): Promise<Map<string, FollowedArtistRelease>> {
  const byMbid = new Map(artists.filter((a) => a.mbid).map((a) => [a.mbid!, a.id]));
  const result = new Map<string, FollowedArtistRelease>();
  if (byMbid.size === 0) return result;
  const rows = (await db.execute(sql`
    SELECT e.title, e.release_group_id, e.artist_mbids::text[] AS artist_mbids,
           COALESCE(e.first_release_date, e.release_date)::text AS date
    FROM release_calendar_entry e
    WHERE e.artist_mbids && ${uuidArray([...byMbid.keys()])}::uuid[]
      AND e.exclusion IS NULL
      AND COALESCE(e.first_release_date, e.release_date)
          BETWEEN ${addDays(today, -PAST_DAYS)}::date AND ${addDays(today, FUTURE_DAYS)}::date
  `)) as unknown as { title: string; release_group_id: string | null; artist_mbids: string[]; date: string }[];

  // Próxima por salir primero (la más cercana); si no, la publicada más reciente.
  const better = (candidate: string, current: string) => {
    const upcoming = candidate >= today;
    const currentUpcoming = current >= today;
    if (upcoming !== currentUpcoming) return upcoming;
    return upcoming ? candidate < current : candidate > current;
  };
  for (const row of rows) {
    for (const mbid of row.artist_mbids) {
      const artistId = byMbid.get(mbid);
      if (!artistId) continue;
      const current = result.get(artistId);
      if (!current || better(row.date, current.date!)) {
        result.set(artistId, {
          title: row.title,
          date: row.date,
          year: Number(row.date.slice(0, 4)),
          releaseGroupId: row.release_group_id,
        });
      }
    }
  }
  return result;
}

/** Último disco publicado por artista en la discografía guardada (D3): Álbum o EP, sin tipos secundarios. */
async function latestReleaseByArtist(
  artistIds: string[],
  today: string,
): Promise<Map<string, FollowedArtistRelease>> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (c.artist_id)
           c.artist_id, rg.id, rg.title, rg.first_release_date::text AS date, rg.first_release_year AS year
    FROM credit c
    JOIN release_group rg ON rg.id = c.release_group_id
    WHERE c.role = 'primary'
      AND c.artist_id = ANY(${uuidArray(artistIds)}::uuid[])
      AND rg.discography_unlisted_at IS NULL
      AND COALESCE(cardinality(rg.secondary_types), 0) = 0
      AND rg.primary_type IN ('Album', 'EP')
      AND rg.first_release_year IS NOT NULL
      AND (rg.first_release_date IS NULL OR rg.first_release_date <= ${today}::date)
      AND rg.first_release_year <= ${Number(today.slice(0, 4))}
    ORDER BY c.artist_id, rg.first_release_year DESC, rg.first_release_date DESC NULLS LAST, rg.id
  `)) as unknown as { artist_id: string; id: string; title: string; date: string | null; year: number }[];
  return new Map(
    rows.map((row) => [
      row.artist_id,
      { title: row.title, date: row.date, year: row.year, releaseGroupId: row.id },
    ]),
  );
}

export async function countFollowedArtists(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(artistFollow)
    .where(eq(artistFollow.userId, userId));
  return row?.n ?? 0;
}

/** Artistas que `userId` sigue de entre `artistIds` (para la afinidad). */
export async function followedArtistIdsWithin(
  userId: string,
  artistIds: string[],
): Promise<Set<string>> {
  if (artistIds.length === 0) return new Set();
  const rows = await db
    .select({ artistId: artistFollow.artistId })
    .from(artistFollow)
    .where(and(eq(artistFollow.userId, userId), inArray(artistFollow.artistId, artistIds)));
  return new Set(rows.map((r) => r.artistId));
}
