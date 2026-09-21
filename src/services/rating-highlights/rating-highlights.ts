import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, rating, ratingHighlight, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { PRIMARY_ARTIST_SQL, RECORDING_COVER_SQL } from "@/services/feed/feed";
import type { ShowcaseEntity } from "@/services/profiles/showcase";

// Tope de valoraciones destacadas por usuario (spec `rating-highlights`,
// "Fijar una valoración como destacada"). Mismo tope (6) que las
// entradas de diario destacadas, sin relación funcional entre sí.
export const RATING_HIGHLIGHT_MAX = 6;

export interface RatingHighlightEntry {
  /** Id de la valoración (`rating.id`), no de la fila de destacado. */
  id: string;
  /** Como la devuelve la BD: "0.5".."5.0" (mismo formato que `FeedRatingMeter` espera). */
  stars: string;
  detailedScore: number | null;
  entity: ShowcaseEntity;
}

function resolveEntity(row: {
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
  artistName: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
  recordingTitle: string | null;
  recordingCover: string | null;
  creditedArtist: string | null;
}): ShowcaseEntity | null {
  if (row.artistId) {
    if (row.artistName == null) return null;
    return { type: "artist", id: row.artistId, title: row.artistName, artistName: null, coverThumbUrl: null };
  }
  if (row.releaseGroupId) {
    if (row.releaseTitle == null) return null;
    return {
      type: "release-group",
      id: row.releaseGroupId,
      title: row.releaseTitle,
      artistName: row.creditedArtist,
      coverThumbUrl: row.releaseCover,
    };
  }
  if (row.recordingId) {
    if (row.recordingTitle == null) return null;
    return {
      type: "recording",
      id: row.recordingId,
      title: row.recordingTitle,
      artistName: row.creditedArtist,
      coverThumbUrl: row.recordingCover,
    };
  }
  return null;
}

/**
 * Valoraciones destacadas de un usuario, más recientes primero. Sin filtro de
 * audiencia: una valoración destacada es visible para cualquier visitante con
 * acceso al perfil, por definición (spec `rating-highlights`).
 */
export async function listRatingHighlights(userId: string): Promise<RatingHighlightEntry[]> {
  const rows = await db
    .select({
      id: rating.id,
      stars: rating.stars,
      detailedScore: rating.detailedScore,
      artistId: rating.artistId,
      releaseGroupId: rating.releaseGroupId,
      recordingId: rating.recordingId,
      artistName: artist.name,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      recordingTitle: recording.title,
      recordingCover: RECORDING_COVER_SQL(rating.recordingId),
      creditedArtist: PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId),
    })
    .from(ratingHighlight)
    .innerJoin(rating, eq(ratingHighlight.ratingId, rating.id))
    .leftJoin(artist, eq(rating.artistId, artist.id))
    .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(rating.recordingId, recording.id))
    .where(eq(ratingHighlight.userId, userId))
    .orderBy(desc(ratingHighlight.highlightedAt));

  const out: RatingHighlightEntry[] = [];
  for (const row of rows) {
    const entity = resolveEntity(row);
    if (entity) out.push({ id: row.id, stars: row.stars, detailedScore: row.detailedScore, entity });
  }
  return out;
}

/**
 * Destaca una valoración propia. Idempotente (destacar una ya destacada no
 * hace nada); rechaza una séptima con `VALIDATION_ERROR`.
 */
export async function highlightRating(userId: string, ratingId: string): Promise<RatingHighlightEntry[]> {
  const [own] = await db
    .select({ id: rating.id })
    .from(rating)
    .where(and(eq(rating.id, ratingId), eq(rating.userId, userId)))
    .limit(1);
  if (!own) throw new ApiError("RATING_NOT_FOUND", 404, "La valoración no existe");

  const [existing] = await db
    .select({ ratingId: ratingHighlight.ratingId })
    .from(ratingHighlight)
    .where(and(eq(ratingHighlight.userId, userId), eq(ratingHighlight.ratingId, ratingId)))
    .limit(1);
  if (existing) return listRatingHighlights(userId);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(ratingHighlight)
    .where(eq(ratingHighlight.userId, userId));
  if ((countRow?.n ?? 0) >= RATING_HIGHLIGHT_MAX) {
    throw new ApiError("VALIDATION_ERROR", 400, `Máximo ${RATING_HIGHLIGHT_MAX} valoraciones destacadas`);
  }

  await db.insert(ratingHighlight).values({ userId, ratingId });
  return listRatingHighlights(userId);
}

/** Quita el destacado de una valoración propia. Idempotente. */
export async function unhighlightRating(userId: string, ratingId: string): Promise<RatingHighlightEntry[]> {
  await db
    .delete(ratingHighlight)
    .where(and(eq(ratingHighlight.userId, userId), eq(ratingHighlight.ratingId, ratingId)));
  return listRatingHighlights(userId);
}

/**
 * Valoraciones destacadas de un perfil para un lector: siempre todas, sin
 * filtro de audiencia ni de relación de seguimiento (spec `rating-highlights`,
 * "Sección 'Valoraciones destacadas' del perfil") — el único filtro es el
 * acceso al perfil en sí (bloqueo, perfil privado sin autorización), igual
 * que el resto de las secciones.
 */
export async function getProfileRatingHighlights(
  username: string,
  viewerId: string | null,
): Promise<RatingHighlightEntry[]> {
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  if (!profile.accessible) return [];
  return listRatingHighlights(profile.id);
}
