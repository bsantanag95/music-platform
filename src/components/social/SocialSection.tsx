"use client";

import type { CommentsResponse, RatingsResponse } from "@/lib/api/schemas";
import { DualRating } from "./DualRating";
import { Comments } from "./Comments";

interface SocialSectionProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  ratings: RatingsResponse;
  comments: CommentsResponse;
  userId?: string;
}

export function SocialSection({ target, targetId, ratings, comments, userId }: SocialSectionProps) {
  return <section className="flex w-full max-w-3xl flex-col gap-8"><DualRating target={target} targetId={targetId} initial={ratings} authenticated={Boolean(userId)} /><Comments target={target} targetId={targetId} initial={comments} authenticated={Boolean(userId)} userId={userId} /></section>;
}
