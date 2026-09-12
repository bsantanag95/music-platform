import type { ReactNode } from "react";
import type { FeedEntry } from "@/lib/api/schemas";

// Glifos de refuerzo por tipo de entrada (openspec: add-feed-kind-differentiation),
// misma familia visual que `ReactionIcons.tsx`: SVG inline de 14px,
// `stroke="currentColor"`, nunca la única señal — siempre acompañan al verbo
// de texto de la línea de metadato. El rating queda afuera de este mapa: su
// medidor VU ya cumple ese rol.

export function ListenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v16l13-8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FavoriteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="15" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1 4.6A7.9 7.9 0 0 1 21 12z" />
    </svg>
  );
}

export function ReviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5a1.5 1.5 0 0 1-1.5 1.5H6.5A2.5 2.5 0 0 1 4 17.5v-12z" />
      <line x1="8" y1="8" x2="15" y2="8" />
      <line x1="8" y1="12" x2="15" y2="12" />
    </svg>
  );
}

export function FollowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7.5" r="3.2" />
      <path d="M3.5 20c0-3.4 2.5-6 5.8-6" />
      <line x1="17" y1="7.5" x2="17" y2="13.5" />
      <line x1="14" y1="10.5" x2="20" y2="10.5" />
    </svg>
  );
}

export const FEED_KIND_ICONS: Partial<Record<FeedEntry["kind"], ReactNode>> = {
  listen: <ListenIcon />,
  favorite: <FavoriteIcon />,
  list: <ListIcon />,
  comment: <CommentIcon />,
  review: <ReviewIcon />,
  // Mismo glifo para los dos tipos de seguimiento (openspec:
  // add-artist-follow-feed-entry): es la misma acción "empezar a seguir",
  // distinta solo en el objetivo y el verbo.
  follow: <FollowIcon />,
  "follow-artist": <FollowIcon />,
};
