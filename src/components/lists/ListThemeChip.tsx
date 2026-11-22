"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ListSubject, ListTheme } from "@/lib/api/schemas";
import { artistHref, genreHref } from "@/lib/catalog-links";
import { LIST_THEME_TONES, useListSubjectName } from "./list-theme-tones";

export { LIST_THEME_DOTS, LIST_THEME_TONES, useListSubjectName } from "./list-theme-tones";

/** Chip del tema de una lista: el nombre siempre acompaña al color. */
export function ListThemeChip({ theme, className = "" }: { theme: ListTheme; className?: string }) {
  const t = useTranslations("lists.theme");
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-data text-xs ${LIST_THEME_TONES[theme]} ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(`names.${theme}`)}
    </span>
  );
}

export function listSubjectHref(subject: ListSubject): string {
  return subject.type === "artist" ? artistHref(subject.name, subject.id) : genreHref(subject.slug);
}

/**
 * "sobre <nombre>" (openspec: add-list-themes-phase1). Enlazado a la ficha salvo `linked={false}`, que lo usa una fila
 * que ya es un enlace (no se anidan enlaces).
 */
export function ListSubjectLabel({ subject, linked = true }: { subject: ListSubject; linked?: boolean }) {
  const t = useTranslations("lists.theme");
  const nameOf = useListSubjectName();
  const name = nameOf(subject);
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1 font-data text-xs text-paper-muted">
      {t.rich("about", {
        name,
        subject: (chunks) =>
          linked ? (
            <Link href={listSubjectHref(subject)} className="truncate text-paper underline-offset-2 hover:text-amber hover:underline">
              {chunks}
            </Link>
          ) : (
            <span className="truncate text-paper">{chunks}</span>
          ),
      })}
    </span>
  );
}

/** Chip de tema + "sobre" en una línea; nada si la lista no tiene ninguno de los dos. */
export function ListThemeLine({
  theme,
  subject,
  linked = true,
  className = "",
}: {
  theme: ListTheme | null;
  subject: ListSubject | null;
  linked?: boolean;
  className?: string;
}) {
  if (!theme && !subject) return null;
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      {theme ? <ListThemeChip theme={theme} /> : null}
      {subject ? <ListSubjectLabel subject={subject} linked={linked} /> : null}
    </span>
  );
}
