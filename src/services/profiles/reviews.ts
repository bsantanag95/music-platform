import { cache } from "react";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rating, releaseGroup, review } from "@/db/schema";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";

// Sección "Reseñas" del perfil (openspec: add-profile-featured-reviews): las
// reseñas de álbum más recientes del dueño, visibles cuando el perfil es
// accesible para el lector. La reseña es contenido público implícito (visible
// en la página del álbum), así que la sección solo se gatea por accesibilidad
// del perfil, no además por relación de seguimiento como los ratings sueltos.
// Cálculo bajo demanda, sin materializar, memoizado por request (mismo patrón
// que `profile-in-rotation` / `taste-fingerprint`).

/** Máximo de reseñas mostradas en la sección; el resto va como "y N más". */
export const PROFILE_REVIEWS_MAX = 4;

export interface ProfileReview {
  id: string;
  title: string | null;
  body: string;
  stars: string | null;
  detailedScore: number | null;
  updatedAt: string;
  album: {
    id: string;
    title: string;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
}

/**
 * Reseñas de álbum del dueño para su perfil, hasta `PROFILE_REVIEWS_MAX`,
 * ordenadas por última edición. Devuelve `null` cuando el perfil no es
 * accesible para el lector (privado sin relación aceptada, o bloqueo) o cuando
 * el dueño no tiene reseñas — en ambos casos la sección no se renderiza.
 * `total` es el recuento completo (para "y N más").
 */
export const getProfileReviews = cache(
  async (
    username: string,
    viewerId: string | null,
  ): Promise<{ reviews: ProfileReview[]; total: number } | null> => {
    const { getProfileByUsername } = await import("@/services/social/profiles");
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return null;

    const rows = await db
      .select({
        id: review.id,
        title: review.title,
        body: review.body,
        updatedAt: review.updatedAt,
        albumId: releaseGroup.id,
        albumTitle: releaseGroup.title,
        albumCover: releaseGroup.coverThumbUrl,
        artistName: PRIMARY_ARTIST_SQL(review.releaseGroupId, review.recordingId),
        stars: rating.stars,
        detailedScore: rating.detailedScore,
        // Ventana: cuenta todas las reseñas del dueño antes del LIMIT.
        total: sql<number>`count(*) over()`,
      })
      .from(review)
      .innerJoin(releaseGroup, eq(releaseGroup.id, review.releaseGroupId))
      .leftJoin(
        rating,
        and(eq(rating.userId, review.userId), eq(rating.releaseGroupId, review.releaseGroupId)),
      )
      .where(and(eq(review.userId, profile.id), isNotNull(review.releaseGroupId)))
      .orderBy(desc(review.updatedAt), desc(review.id))
      .limit(PROFILE_REVIEWS_MAX);

    if (rows.length === 0) return null;

    return {
      total: Number(rows[0]!.total),
      reviews: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        stars: row.stars,
        detailedScore: row.detailedScore,
        updatedAt: row.updatedAt.toISOString(),
        album: {
          id: row.albumId,
          title: row.albumTitle,
          artistName: row.artistName,
          coverThumbUrl: row.albumCover,
        },
      })),
    };
  },
);
