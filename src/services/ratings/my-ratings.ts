import { and, asc, desc, eq, isNotNull, isNull, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { rating, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { PRIMARY_ARTIST_SQL, PRIMARY_ARTIST_ID_SQL, RECORDING_COVER_SQL } from "@/services/feed/feed";
import { escapeLike } from "@/services/catalog/search/normalize";
import {
  MY_RATING_GROUPS,
  MY_RATING_SEARCH_MAX_LENGTH,
  type MyRatingGroup,
  type MyRatingEntry,
  type MyRatingsFilters,
  type MyRatingsListResponse,
} from "@/lib/api/schemas";

export const MY_RATING_SORTS = ["best", "worst", "recent", "title"] as const;
export type MyRatingSort = (typeof MY_RATING_SORTS)[number];

const RECORDING_YEAR_SQL = (recordingIdCol: AnyColumn) =>
  sql<number | null>`(
    SELECT min(rg.first_release_year)::int
    FROM track t
    JOIN release r ON r.id = t.release_id
    JOIN release_group rg ON rg.id = r.release_group_id
    WHERE t.recording_id = ${recordingIdCol}
      AND rg.first_release_year IS NOT NULL
  )`;

function normalizeFilters(filters?: MyRatingsFilters) {
  const sort: MyRatingSort = filters?.sort ?? "best";
  if (!MY_RATING_SORTS.includes(sort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  const group: MyRatingGroup = filters?.group ?? "type";
  if (!MY_RATING_GROUPS.includes(group)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La agrupación no es válida");
  }
  const q = filters?.q?.trim() ?? "";
  if (q.length > MY_RATING_SEARCH_MAX_LENGTH) {
    throw new ApiError("VALIDATION_ERROR", 400, "La búsqueda es demasiado larga");
  }
  if (filters?.stars !== undefined) {
    const stars = Number(filters.stars);
    if (!Number.isFinite(stars) || stars < 0.5 || stars > 5 || Math.round(stars * 2) !== stars * 2) {
      throw new ApiError("VALIDATION_ERROR", 400, "Las estrellas no son válidas");
    }
  }
  if (filters?.type !== undefined && filters.type !== "release-group" && filters.type !== "recording") {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo no es válido");
  }
  if (filters?.year !== undefined) {
    const year = Number(filters.year);
    if (!Number.isInteger(year)) {
      throw new ApiError("VALIDATION_ERROR", 400, "El año no es válido");
    }
  }
  if (filters?.decade !== undefined) {
    const decade = Number(filters.decade);
    if (!Number.isInteger(decade) || decade % 10 !== 0) {
      throw new ApiError("VALIDATION_ERROR", 400, "La década no es válida");
    }
  }
  return {
    sort,
    group,
    q: q || undefined,
    stars: filters?.stars !== undefined ? Number(filters.stars) : undefined,
    type: filters?.type,
    year: filters?.year !== undefined ? Number(filters.year) : undefined,
    decade: filters?.decade !== undefined ? Number(filters.decade) : undefined,
  };
}

const RELEASE_TITLE = releaseGroup.title;
const RECORDING_TITLE = recording.title;

const TITLE_EXPR = sql`coalesce(${RELEASE_TITLE}, ${RECORDING_TITLE})`;

// Rango fijo de tipo para que la agrupación por tipo ponga los álbumes antes que las
// canciones (mismo recurso que `TYPE_RANK_EXPR` de favoritos). Es el primer criterio del
// orden, así "Cargar más" agrega al final de la sección que corresponde.
const TYPE_RANK_EXPR = sql`CASE WHEN ${rating.releaseGroupId} IS NOT NULL THEN 0 ELSE 1 END`;

// Orden de la agrupación por artista: por nombre del artista principal acreditado (sin
// distinguir mayúsculas, las valoraciones sin artista al final) y, a igual nombre, por id para
// que cada artista quede contiguo aunque haya nombres repetidos.
const ARTIST_GROUP_ORDER: SQL[] = [
  sql`lower(${PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId)}) ASC NULLS LAST`,
  sql`${PRIMARY_ARTIST_ID_SQL(rating.releaseGroupId, rating.recordingId)} ASC NULLS LAST`,
];

function groupOrder(group: MyRatingGroup): SQL[] {
  if (group === "artist") return [...ARTIST_GROUP_ORDER, asc(TYPE_RANK_EXPR)];
  if (group === "type") return [asc(TYPE_RANK_EXPR)];
  return [];
}

// Búsqueda de texto: título del álbum o la canción, o su artista principal acreditado
// (mismo criterio que la búsqueda de favoritos y de la colección).
function textMatch(q: string): SQL {
  const pattern = `%${escapeLike(q)}%`;
  return sql`(${TITLE_EXPR} ILIKE ${pattern} OR ${PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId)} ILIKE ${pattern})`;
}

function sortOrder(sort: MyRatingSort): SQL[] {
  const starsNumeric = sql`(${rating.stars})::float`;
  const scoreExpr = sql`${rating.detailedScore}`;
  switch (sort) {
    case "best":
      return [
        desc(starsNumeric),
        sql`${scoreExpr} DESC NULLS LAST`,
        desc(rating.updatedAt),
        asc(rating.id),
      ];
    case "worst":
      return [
        asc(starsNumeric),
        sql`${scoreExpr} ASC NULLS LAST`,
        desc(rating.updatedAt),
        asc(rating.id),
      ];
    case "recent":
      return [desc(rating.updatedAt), asc(rating.id)];
    case "title":
      return [asc(sql`lower(${TITLE_EXPR})`), asc(rating.id)];
  }
}

function buildYearExpr(): SQL {
  return sql`CASE
    WHEN ${rating.releaseGroupId} IS NOT NULL THEN ${releaseGroup.firstReleaseYear}
    WHEN ${rating.recordingId} IS NOT NULL THEN (${RECORDING_YEAR_SQL(rating.recordingId)})
    ELSE NULL
  END`;
}

export async function listMyRatings(
  userId: string,
  page = 1,
  pageSize = 20,
  filters?: MyRatingsFilters,
): Promise<MyRatingsListResponse> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const normalized = normalizeFilters(filters);

  const baseConditions: SQL[] = [
    eq(rating.userId, userId),
    isNull(rating.artistId),
  ];

  if (normalized.stars !== undefined) {
    baseConditions.push(eq(sql`(${rating.stars})::float`, normalized.stars));
  }
  if (normalized.type === "release-group") {
    baseConditions.push(isNotNull(rating.releaseGroupId));
  } else if (normalized.type === "recording") {
    baseConditions.push(isNotNull(rating.recordingId));
  }
  if (normalized.q) {
    baseConditions.push(textMatch(normalized.q));
  }

  const yearExpr = buildYearExpr();

  if (normalized.year !== undefined) {
    baseConditions.push(eq(yearExpr, normalized.year));
  } else if (normalized.decade !== undefined) {
    const decadeStart = normalized.decade;
    const decadeEnd = decadeStart + 9;
    baseConditions.push(sql`${yearExpr} BETWEEN ${decadeStart} AND ${decadeEnd}`);
  }

  const whereClause = and(...baseConditions);

  const [totalRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
      albums: sql<number>`(count(*) FILTER (WHERE ${rating.releaseGroupId} IS NOT NULL))::int`,
      songs: sql<number>`(count(*) FILTER (WHERE ${rating.recordingId} IS NOT NULL))::int`,
    })
    .from(rating)
    .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(rating.recordingId, recording.id))
    .where(whereClause);
  const total = totalRow?.count ?? 0;
  const counts = {
    "release-group": totalRow?.albums ?? 0,
    recording: totalRow?.songs ?? 0,
  };

  const rows = await db
    .select({
      id: rating.id,
      stars: rating.stars,
      detailedScore: rating.detailedScore,
      updatedAt: rating.updatedAt,
      artistId: rating.artistId,
      releaseGroupId: rating.releaseGroupId,
      recordingId: rating.recordingId,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      releaseYear: releaseGroup.firstReleaseYear,
      recordingTitle: recording.title,
      creditedArtist: PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId),
      creditedArtistId: PRIMARY_ARTIST_ID_SQL(rating.releaseGroupId, rating.recordingId),
      recordingCover: RECORDING_COVER_SQL(rating.recordingId),
      recordingYear: RECORDING_YEAR_SQL(rating.recordingId),
    })
    .from(rating)
    .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(rating.recordingId, recording.id))
    .where(whereClause)
    .orderBy(...groupOrder(normalized.group), ...sortOrder(normalized.sort))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const yearRows = await db
    .select({ year: sql<number>`distinct (${buildYearExpr()})::int` })
    .from(rating)
    .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(rating.recordingId, recording.id))
    .where(and(eq(rating.userId, userId), isNull(rating.artistId), isNotNull(buildYearExpr())))
    .orderBy(desc(sql`1`));

  const items = rows.slice(0, pageSize).map(serializeMyRating);
  const hasNext = rows.length > pageSize;
  const years = yearRows.map((row) => row.year).filter((year): year is number => year !== null);

  return { items, page, pageSize, hasNext, total, counts, facets: { years } };
}

function serializeMyRating(row: {
  id: string;
  stars: string;
  detailedScore: number | null;
  updatedAt: Date;
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
  releaseYear: number | null;
  recordingTitle: string | null;
  creditedArtist: string | null;
  creditedArtistId: string | null;
  recordingCover: string | null;
  recordingYear: number | null;
}): MyRatingEntry {
  if (row.releaseGroupId) {
    return {
      id: row.id,
      targetType: "release-group",
      stars: Number(row.stars),
      detailedScore: row.detailedScore,
      updatedAt: row.updatedAt.toISOString(),
      target: {
        id: row.releaseGroupId,
        title: row.releaseTitle ?? "",
        coverThumbUrl: row.releaseCover,
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        year: row.releaseYear,
      },
    };
  }
  return {
    id: row.id,
    targetType: "recording",
    stars: Number(row.stars),
    detailedScore: row.detailedScore,
    updatedAt: row.updatedAt.toISOString(),
    target: {
      id: row.recordingId!,
      title: row.recordingTitle ?? "",
      coverThumbUrl: row.recordingCover,
      artistName: row.creditedArtist,
      artistId: row.creditedArtistId,
      year: row.recordingYear,
    },
  };
}
