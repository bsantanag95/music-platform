import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, rating, releaseGroup, review, type ReviewRow } from "@/db/schema";
import { maskAuthor } from "@/services/auth/account-status";
import { ApiError } from "@/lib/api/errors";
import type { Review, ReviewRequest, ReviewSort, ReviewUpdate, SocialTargetType } from "@/lib/api/schemas";
import {
  resolveSocialTarget,
  targetValues,
  validateRating,
  type SocialTarget,
} from "./social";

export { resolveSocialTarget };

// Objetivos que aceptan escritura de reseñas en esta versión. El esquema
// admite los tres; esta lista es la restricción de producto de Fase 1
// (openspec: add-album-review). Habilitar artista/canción = añadirlos acá.
const REVIEWABLE_TARGET_TYPES: readonly SocialTargetType[] = ["release-group"];

function assertReviewableTarget(target: SocialTarget) {
  if (!REVIEWABLE_TARGET_TYPES.includes(target.type)) {
    throw new ApiError(
      "REVIEW_TARGET_NOT_SUPPORTED",
      400,
      "Las reseñas de artista y canción llegan más adelante",
    );
  }
}

function reviewTargetWhere(target: SocialTarget) {
  return eq(
    {
      artistId: review.artistId,
      releaseGroupId: review.releaseGroupId,
      recordingId: review.recordingId,
    }[target.column],
    target.id,
  );
}

/** Columna de target de `review` a partir de la fila (para responder tras una mutación). */
function targetColumnOf(row: Pick<ReviewRow, "artistId" | "releaseGroupId" | "recordingId">) {
  if (row.artistId) return "artistId" as const;
  if (row.releaseGroupId) return "releaseGroupId" as const;
  return "recordingId" as const;
}

function serializeReview(row: {
  id: string;
  title: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; username: string | null; displayName: string | null; deactivatedAt: Date | null };
  stars: string | null;
  detailedScore: number | null;
}): Review {
  return {
    id: row.id,
    // Una cuenta desactivada conserva sus reseñas, pero sin nombre ni usuario reales.
    user: maskAuthor(row.user),
    title: row.title,
    body: row.body,
    rating:
      row.stars !== null
        ? { stars: Number(row.stars), detailedScore: row.detailedScore }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const reviewSelection = {
  id: review.id,
  title: review.title,
  body: review.body,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, deactivatedAt: appUser.deactivatedAt },
  stars: rating.stars,
  detailedScore: rating.detailedScore,
};

/**
 * Orden del índice de reseñas (openspec: redesign-album-page): por fecha, o por las
 * estrellas vigentes del autor (las reseñas sin rating van al final en ambos sentidos).
 */
function reviewOrder(sort: ReviewSort): SQL[] {
  if (sort === "best") return [sql`${rating.stars} desc nulls last`, desc(review.createdAt), desc(review.id)];
  if (sort === "worst") return [sql`${rating.stars} asc nulls last`, desc(review.createdAt), desc(review.id)];
  return [desc(review.createdAt), desc(review.id)];
}

export async function listReviews(
  target: SocialTarget,
  page = 1,
  pageSize = 20,
  sort: ReviewSort = "recent",
) {
  const targetColumn = target.column;
  const rows = await db
    .select(reviewSelection)
    .from(review)
    .innerJoin(appUser, eq(review.userId, appUser.id))
    .leftJoin(
      rating,
      and(eq(rating.userId, review.userId), eq(rating[targetColumn], target.id)),
    )
    .where(and(reviewTargetWhere(target), eq(review.moderationStatus, "visible")))
    .orderBy(...reviewOrder(sort))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    reviews: rows.slice(0, pageSize).map(serializeReview),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

/** Tope de ids para anterior/siguiente en el modal de reseña. */
const REVIEW_NAVIGATION_LIMIT = 500;

/**
 * Ids de las reseñas visibles de un objetivo en el orden del índice, para navegar
 * anterior/siguiente desde el modal de una reseña.
 */
export async function listReviewIds(target: SocialTarget, sort: ReviewSort = "recent"): Promise<string[]> {
  const rows = await db
    .select({ id: review.id })
    .from(review)
    .leftJoin(
      rating,
      and(eq(rating.userId, review.userId), eq(rating[target.column], target.id)),
    )
    .where(and(reviewTargetWhere(target), eq(review.moderationStatus, "visible")))
    .orderBy(...reviewOrder(sort))
    .limit(REVIEW_NAVIGATION_LIMIT);
  return rows.map((row) => row.id);
}

export interface ReviewDetail {
  review: Review;
  album: { id: string; title: string; coverThumbUrl: string | null };
}

/**
 * Una reseña visible de álbum con su álbum, para `/review/{id}` y su modal
 * (openspec: redesign-album-page, capability `review-detail`). Mismas reglas de
 * visibilidad que el listado: solo `moderation_status = 'visible'`, autor desactivado
 * enmascarado. `null` si no existe, no es visible o no es de un álbum.
 */
export async function getReviewDetail(reviewId: string): Promise<ReviewDetail | null> {
  const [row] = await db
    .select({
      ...reviewSelection,
      albumId: releaseGroup.id,
      albumTitle: releaseGroup.title,
      albumCover: releaseGroup.coverThumbUrl,
    })
    .from(review)
    .innerJoin(appUser, eq(review.userId, appUser.id))
    .innerJoin(releaseGroup, eq(releaseGroup.id, review.releaseGroupId))
    .leftJoin(
      rating,
      and(eq(rating.userId, review.userId), eq(rating.releaseGroupId, review.releaseGroupId)),
    )
    .where(and(eq(review.id, reviewId), eq(review.moderationStatus, "visible")))
    .limit(1);
  if (!row) return null;
  const { albumId, albumTitle, albumCover, ...reviewRow } = row;
  return {
    review: serializeReview(reviewRow),
    album: { id: albumId, title: albumTitle, coverThumbUrl: albumCover },
  };
}

async function getReviewResponse(reviewId: string): Promise<Review> {
  const [base] = await db
    .select({
      id: review.id,
      title: review.title,
      body: review.body,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      userId: review.userId,
      artistId: review.artistId,
      releaseGroupId: review.releaseGroupId,
      recordingId: review.recordingId,
      user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, deactivatedAt: appUser.deactivatedAt },
    })
    .from(review)
    .innerJoin(appUser, eq(review.userId, appUser.id))
    .where(eq(review.id, reviewId))
    .limit(1);
  if (!base) throw new ApiError("REVIEW_NOT_FOUND", 404, "Reseña no encontrada");

  const column = targetColumnOf(base);
  const [ratingRow] = await db
    .select({ stars: rating.stars, detailedScore: rating.detailedScore })
    .from(rating)
    .where(and(eq(rating.userId, base.userId), eq(rating[column], base[column]!)))
    .limit(1);

  return serializeReview({
    ...base,
    stars: ratingRow?.stars ?? null,
    detailedScore: ratingRow?.detailedScore ?? null,
  });
}

/** Upsert idempotente del `rating` del autor dentro de una transacción. */
async function upsertRatingTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  target: SocialTarget,
  userId: string,
  stars: number,
  detailedScore: number | undefined,
) {
  validateRating(stars, detailedScore);
  const targetColumn = rating[target.column];
  const value = { stars: String(stars), detailedScore: detailedScore ?? null };
  await tx
    .insert(rating)
    .values({ ...targetValues(target), userId, ...value })
    .onConflictDoUpdate({
      target: [rating.userId, targetColumn],
      targetWhere: sql`${targetColumn} IS NOT NULL`,
      set: value,
    });
}

async function ownRatingExists(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  target: SocialTarget,
  userId: string,
) {
  const [own] = await tx
    .select({ id: rating.id })
    .from(rating)
    .where(and(eq(rating.userId, userId), eq(rating[target.column], target.id)))
    .limit(1);
  return Boolean(own);
}

export async function createOrReplaceReview(
  target: SocialTarget,
  userId: string,
  input: ReviewRequest,
): Promise<Review> {
  assertReviewableTarget(target);

  const savedId = await db.transaction(async (tx) => {
    if (input.stars !== undefined) {
      await upsertRatingTx(tx, target, userId, input.stars, input.detailedScore);
    } else if (!(await ownRatingExists(tx, target, userId))) {
      throw new ApiError(
        "REVIEW_REQUIRES_RATING",
        400,
        "Valora el álbum antes de reseñarlo",
      );
    }

    const targetColumn = review[target.column];
    const [saved] = await tx
      .insert(review)
      .values({ ...targetValues(target), userId, title: input.title, body: input.body })
      .onConflictDoUpdate({
        target: [review.userId, targetColumn],
        targetWhere: sql`${targetColumn} IS NOT NULL`,
        set: { title: input.title, body: input.body },
      })
      .returning({ id: review.id });
    if (!saved) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo guardar la reseña");
    return saved.id;
  });

  return getReviewResponse(savedId);
}

export async function updateReview(
  reviewId: string,
  userId: string,
  input: ReviewUpdate,
): Promise<Review> {
  const [existing] = await db
    .select({
      id: review.id,
      userId: review.userId,
      artistId: review.artistId,
      releaseGroupId: review.releaseGroupId,
      recordingId: review.recordingId,
    })
    .from(review)
    .where(eq(review.id, reviewId))
    .limit(1);
  if (!existing) throw new ApiError("REVIEW_NOT_FOUND", 404, "Reseña no encontrada");
  if (existing.userId !== userId) {
    throw new ApiError("PERMISSION_DENIED", 403, "No puedes modificar esta reseña");
  }

  const column = targetColumnOf(existing);
  const target: SocialTarget = {
    type:
      column === "artistId"
        ? "artist"
        : column === "releaseGroupId"
          ? "release-group"
          : "recording",
    id: existing[column]!,
    column,
  };

  await db.transaction(async (tx) => {
    if (input.stars !== undefined) {
      await upsertRatingTx(tx, target, userId, input.stars, input.detailedScore);
    }
    const set: Partial<Pick<ReviewRow, "title" | "body">> = {};
    if (input.title !== undefined) set.title = input.title;
    if (input.body !== undefined) set.body = input.body;
    if (Object.keys(set).length > 0) {
      await tx.update(review).set(set).where(eq(review.id, reviewId));
    }
  });

  return getReviewResponse(reviewId);
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const [existing] = await db
    .select({ id: review.id, userId: review.userId })
    .from(review)
    .where(eq(review.id, reviewId))
    .limit(1);
  if (!existing) throw new ApiError("REVIEW_NOT_FOUND", 404, "Reseña no encontrada");
  if (existing.userId !== userId) {
    throw new ApiError("PERMISSION_DENIED", 403, "No puedes borrar esta reseña");
  }
  // Borrado físico. NO toca `rating`: son objetos con lifecycle propio.
  await db.delete(review).where(eq(review.id, reviewId));
}
