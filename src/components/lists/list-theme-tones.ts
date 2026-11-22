"use client";

// Tonos del tema de lista y nombre del "sobre" (openspec: add-list-themes-phase1). Sin dependencias de navegación: lo
// usan el chip y los selectores del formulario de lista.
import { useLocale } from "next-intl";
import type { ListSubject, ListTheme } from "@/lib/api/schemas";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";

/**
 * Tono de cada tema (openspec: add-list-themes-phase1): texto en el token `--color-list-theme-*` sobre el mismo tono al
 * 14 %. Clases literales para que Tailwind las genere; el contraste está medido en design-tokens-naming.md.
 */
export const LIST_THEME_TONES: Record<ListTheme, string> = {
  start_here: "text-list-theme-start-here bg-list-theme-start-here/14",
  recommendations: "text-list-theme-recommendations bg-list-theme-recommendations/14",
  personal_ranking: "text-list-theme-personal-ranking bg-list-theme-personal-ranking/14",
  hidden_gems: "text-list-theme-hidden-gems bg-list-theme-hidden-gems/14",
  moment: "text-list-theme-moment bg-list-theme-moment/14",
  history: "text-list-theme-history bg-list-theme-history/14",
  connections: "text-list-theme-connections bg-list-theme-connections/14",
  year_review: "text-list-theme-year-review bg-list-theme-year-review/14",
  curiosities: "text-list-theme-curiosities bg-list-theme-curiosities/14",
  other: "text-list-theme-other bg-list-theme-other/14",
};

/** Solo el punto del tono (selector de tema del formulario). */
export const LIST_THEME_DOTS: Record<ListTheme, string> = {
  start_here: "bg-list-theme-start-here",
  recommendations: "bg-list-theme-recommendations",
  personal_ranking: "bg-list-theme-personal-ranking",
  hidden_gems: "bg-list-theme-hidden-gems",
  moment: "bg-list-theme-moment",
  history: "bg-list-theme-history",
  connections: "bg-list-theme-connections",
  year_review: "bg-list-theme-year-review",
  curiosities: "bg-list-theme-curiosities",
  other: "bg-list-theme-other",
};

export function useListSubjectName(): (subject: ListSubject) => string {
  const locale = useLocale();
  return (subject) =>
    subject.type === "genre" ? genreDisplayName(subject, genreLocaleOf(locale)) : subject.name;
}

