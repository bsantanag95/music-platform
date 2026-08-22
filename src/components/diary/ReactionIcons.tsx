import type { ReactNode } from "react";
import type { ListenReaction } from "@/lib/api/schemas";

// Iconos inline SVG simples como refuerzo visual de las reacciones. Nunca
// son la única señal: el texto localizado de cada reacción siempre es
// visible y accesible (la etiqueta acompaña al icono).

export function ThumbUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c4.42 0 8-3.13 8-7 0-3.15-2-5.42-3.5-7C15 6 14 4 12 2c0 3-1.5 4-3 6s-3 3.3-3 7c0 3.87 3.58 7 8 7z" />
    </svg>
  );
}

export function NeutralFaceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="9" x2="10" y2="9" />
      <line x1="14" y1="9" x2="16" y2="9" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}

export function ThumbDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

export const REACTION_ICONS: Record<ListenReaction, ReactNode> = {
  liked: <ThumbUpIcon />,
  loved: <HeartIcon />,
  obsessed: <FlameIcon />,
  neutral: <NeutralFaceIcon />,
  disliked: <ThumbDownIcon />,
};