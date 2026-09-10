"use client";

import type { CommentsResponse, RatingsResponse, ReviewsResponse } from "@/lib/api/schemas";
import { DualRating } from "./DualRating";
import { Reviews } from "./Reviews";
import { Comments } from "./Comments";

interface SocialSectionProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  ratings: RatingsResponse;
  comments: CommentsResponse;
  userId?: string;
  /**
   * Reseñas del objetivo. Solo se pasa (y renderiza) en la página de álbum
   * — la escritura de reseñas está restringida a `release-group` en esta
   * versión (openspec: add-album-review).
   */
  reviews?: ReviewsResponse;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate?: boolean;
}

export function SocialSection({
  target,
  targetId,
  ratings,
  comments,
  userId,
  reviews,
  canModerate = false,
}: SocialSectionProps) {
  return (
    <section className="flex w-full max-w-3xl flex-col gap-8">
      <DualRating
        target={target}
        targetId={targetId}
        initial={ratings}
        authenticated={Boolean(userId)}
      />
      {target === "release-group" && reviews && (
        <Reviews
          target={target}
          targetId={targetId}
          initial={reviews}
          authenticated={Boolean(userId)}
          userId={userId}
          ownStars={ratings.own?.stars ?? 0}
          canModerate={canModerate}
        />
      )}
      <Comments
        target={target}
        targetId={targetId}
        initial={comments}
        authenticated={Boolean(userId)}
        userId={userId}
        canModerate={canModerate}
      />
    </section>
  );
}
