"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { getUserListDetail } from "@/lib/api/lists";
import type { UserListItem } from "@/lib/api/schemas";
import { ListCoverMosaic } from "./ListCoverMosaic";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";
import type { ReaderEntry } from "./reader-entries";

/** Elementos que muestra la vista previa; el resto, en la lista. */
export const PREVIEW_ITEMS = 8;

export const listPreviewKey = (id: string) => ["lists", "preview", id] as const;

/**
 * Vista previa de la lista elegida en el lector de `/lists` (openspec: redesign-lists-phase2), desde `lg`. La cabecera sale de
 * la fila (se pinta al instante); los elementos se piden a `GET /api/users/{username}/lists/{listId}` y quedan en caché por id.
 * La primera lista llega resuelta del servidor (`initialItems`). Si la petición falla o la lista ya no se ve, lo dice y ofrece
 * abrirla.
 */
export function ListPreview({
  entry,
  initialItems,
  enabled,
}: {
  entry: ReaderEntry;
  /** Elementos ya resueltos en el servidor para esta lista (solo la primera). */
  initialItems?: UserListItem[];
  /** Pedir los elementos: solo con la vista previa a la vista (desde `lg`). */
  enabled: boolean;
}) {
  const t = useTranslations("lists");
  const tCamino = useTranslations("camino");
  const query = useQuery({
    queryKey: listPreviewKey(entry.id),
    queryFn: () => getUserListDetail(entry.ownerUsername, entry.id).then((list) => list.items),
    enabled: enabled && entry.previewable,
    initialData: initialItems,
    staleTime: 60_000,
    retry: false,
  });
  const items = query.data?.slice(0, PREVIEW_ITEMS);

  return (
    <section
      aria-label={t("community.reader.previewLabel", { title: entry.title })}
      className="overflow-hidden rounded-2xl border border-ink-border bg-ink-surface"
    >
      <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-6 border-b border-ink-border bg-gradient-to-b from-amber/[0.06] to-transparent p-6 xl:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] xl:p-7">
        <ListCoverMosaic
          coverThumbs={entry.coverThumbs}
          itemCount={entry.itemCount}
          entityType={entry.entityType}
          className="w-full self-start shadow-[0_24px_40px_-20px_rgba(0,0,0,0.9)]"
        />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <span className="rounded bg-ink px-1.5 py-0.5 font-data text-xs text-paper-muted">
            {t(entityTypeKey(entry.entityType))} · {t("itemsCount", { count: entry.itemCount })}
          </span>
          <h2 className="text-balance font-display text-[clamp(1.75rem,2.4vw,2.375rem)] font-bold leading-[1.02] tracking-[-0.025em] text-paper">
            {entry.title}
          </h2>
          <p className="font-body text-sm text-paper-muted">
            {entry.ownerHref ? (
              <Link href={entry.ownerHref} className="text-paper transition-colors hover:text-amber">
                {t("byOwner", { name: entry.ownerName })}
              </Link>
            ) : (
              <span className="text-paper">{t("byOwner", { name: entry.ownerName })}</span>
            )}
            {entry.updatedAt ? (
              <>
                <span aria-hidden> · </span>
                <RelativeDate iso={entry.updatedAt} />
              </>
            ) : null}
          </p>
          {entry.description ? <p className="line-clamp-3 max-w-[52ch] font-body text-paper">{entry.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={entry.href}
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-amber px-4 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
            >
              {t("community.reader.open")}
            </Link>
            {entry.save ? (
              <SaveListButton
                key={`${entry.id}:${entry.save.saved}:${entry.save.following}`}
                listId={entry.id}
                initialSaved={entry.save.saved}
                initialFollowing={entry.save.following}
                variant="full"
              />
            ) : null}
            {entry.saveCount ? (
              <span className="font-data text-xs text-paper-muted">{t("savesCount", { count: entry.saveCount })}</span>
            ) : null}
            {entry.trackingCount !== null ? (
              <span className="font-data text-xs text-petrol-hover">{tCamino("trackingCount", { count: entry.trackingCount })}</span>
            ) : null}
          </div>
        </div>
      </div>

      {entry.previewable ? (
        <div className="px-6 pb-5 pt-2 xl:px-7">
          {items ? (
            items.length > 0 ? (
              <ol className="flex flex-col">
                {items.map((item, index) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[1.75rem_2.75rem_minmax(0,1fr)] items-center gap-3.5 border-b border-ink-border py-2.5"
                  >
                    <span className="text-right font-data text-xs tabular-nums text-paper-muted">{index + 1}</span>
                    <CoverThumb
                      cover={item.target.coverThumbUrl}
                      label=""
                      className={`size-11 ring-1 ring-ink ${entry.entityType === "artist" ? "rounded-full" : "rounded"}`}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-sm text-paper">{item.target.title}</span>
                      {item.target.artistName ? (
                        <span className="truncate font-body text-sm text-paper-muted">{item.target.artistName}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null
          ) : query.isError ? (
            <p role="alert" className="py-6 font-body text-sm text-paper-muted">
              {t("community.reader.loadError")}
            </p>
          ) : (
            // Mientras llegan los elementos: cuatro filas de esqueleto con la misma forma.
            <ol aria-hidden="true" className="flex flex-col">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="grid grid-cols-[1.75rem_2.75rem_minmax(0,1fr)] items-center gap-3.5 border-b border-ink-border py-2.5">
                  <span />
                  <span className="size-11 animate-pulse rounded bg-ink" />
                  <span className="h-3 w-2/3 animate-pulse rounded bg-ink" />
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-center justify-between pt-4">
            <span className="font-data text-xs text-paper-muted">
              {items && items.length > 0
                ? t("community.reader.shownOf", { shown: items.length, total: entry.itemCount })
                : null}
            </span>
            <Link href={entry.href} className="font-data text-xs text-paper-muted transition-colors hover:text-amber">
              {t("community.reader.seeFull")} →
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
