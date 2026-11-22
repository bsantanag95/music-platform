"use client";

import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { ListCoverMosaic } from "./ListCoverMosaic";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";
import type { ReaderEntry } from "./reader-entries";

/** Ancho desde el que el lector tiene vista previa (`lg`). */
export const READER_PREVIEW_QUERY = "(min-width: 1024px)";

/**
 * Fila del lector de `/lists` (openspec: redesign-lists-phase2): mosaico, título, dueño · fecha y una línea de datos con tipo,
 * elementos y guardadas (o cuántas personas la completan). Es un enlace a la lista; desde `lg`, un clic primario sin teclas
 * (o Enter) la elige para la vista previa en vez de navegar. Ctrl/Cmd + clic y el clic central siguen abriendo la lista.
 */
export function ListRow({
  entry,
  selected = false,
  onSelect,
}: {
  entry: ReaderEntry;
  selected?: boolean;
  /** Sin él (modo sin vista previa), la fila solo navega. */
  onSelect?: (entry: ReaderEntry) => void;
}) {
  const t = useTranslations("lists");
  const tCamino = useTranslations("camino");

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof window === "undefined" || !window.matchMedia(READER_PREVIEW_QUERY).matches) return;
    event.preventDefault();
    onSelect(entry);
  };

  return (
    <li className="flex items-center gap-2 border-b border-ink-border last:border-b-0">
      <Link
        href={entry.href}
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={`group flex min-w-0 flex-1 items-center gap-4 rounded-lg px-2 py-3 transition-colors sm:px-3 ${
          selected ? "bg-ink-surface ring-1 ring-inset ring-ink-border" : "hover:bg-ink-surface/60"
        }`}
      >
        <ListCoverMosaic
          coverThumbs={entry.coverThumbs}
          itemCount={entry.itemCount}
          entityType={entry.entityType}
          className="w-14 shrink-0 sm:w-16"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          {entry.isOfficial ? (
            <span className="mb-0.5 inline-flex w-fit items-center gap-1 rounded border border-petrol-hover/50 px-1.5 py-px font-data text-xs text-petrol-hover">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="size-3">
                <path d="M5 12.5 10 17.5 19 7" />
              </svg>
              {t("officialBadge")}
            </span>
          ) : null}
          <span
            className={`truncate font-display text-base transition-colors group-hover:text-amber ${selected ? "text-amber" : "text-paper"}`}
          >
            {entry.title}
          </span>
          <span className="truncate font-body text-sm text-paper-muted">
            {entry.ownerName}
            {entry.updatedAt ? (
              <>
                <span aria-hidden> · </span>
                <RelativeDate iso={entry.updatedAt} />
              </>
            ) : null}
          </span>
          <span className="truncate font-data text-xs text-paper-muted">
            {entry.trackingCount !== null ? (
              <span className="text-petrol-hover">{tCamino("trackingCount", { count: entry.trackingCount })}</span>
            ) : (
              <>
                {t(entityTypeKey(entry.entityType))}
                <span aria-hidden> · </span>
                {t("itemsCount", { count: entry.itemCount })}
                {entry.saveCount ? (
                  <>
                    <span aria-hidden> · </span>
                    {t("savesCount", { count: entry.saveCount })}
                  </>
                ) : null}
              </>
            )}
          </span>
        </span>
      </Link>
      {entry.save ? (
        <span className="shrink-0">
          <SaveListButton
            key={`${entry.id}:${entry.save.saved}:${entry.save.following}`}
            listId={entry.id}
            initialSaved={entry.save.saved}
            initialFollowing={entry.save.following}
            variant="compact"
          />
        </span>
      ) : null}
    </li>
  );
}
