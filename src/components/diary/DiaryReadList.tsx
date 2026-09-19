"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ProsePanel, TargetTitle } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUserDiary } from "@/lib/api/diary";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";
import { ReactionGlyph } from "./ReactionBadge";

const PAGE_SIZE = 20;

interface DiaryReadListProps {
  initial: DiaryListResponse;
  /** Dueño del diario: el "Cargar más" pide SUS entradas, nunca las del visitante. */
  username: string;
  /**
   * En el perfil (Nivel 2) la lista vive dentro de una caja de altura fija con
   * scroll interno — el "Cargar más" queda adentro de la caja. En la vista
   * completa (`/users/[username]/diary`) fluye con la página, sin caja.
   */
  scrollable?: boolean;
  empty?: { title: string; description: string };
}

// Filas de solo lectura del diario de una persona (openspec: rework-user-profile,
// diario del Nivel 2 con tope). Mismo lenguaje que las filas de `/me/diary`
// (`DiaryActivityList`): sin caja por entrada, separadas por una línea fina,
// carátula chica, la nota como cita con borde izquierdo — pero sin las acciones
// de gestión (editar, menú, audiencia) y con la fecha corta a la derecha en vez
// del bloque de día + encabezados de mes (elegido entre mockups: la lista
// plana gana ancho para el título, y el scroll interno no necesita el mes como
// orientación porque la fecha ya está en cada fila).
export function DiaryReadList({ initial, username, scrollable, empty }: DiaryReadListProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const [entries, setEntries] = useState<ListenEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (entries.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? t("profileEmptyTitle")}
        description={empty?.description ?? t("profileEmptyDescription")}
      />
    );
  }

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getUserDiary(username, page + 1, PAGE_SIZE);
      setEntries((current) => [...current, ...next.entries]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const list = (
    <>
      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => {
          const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
          const cover = entry.target.type === "release-group" ? entry.target.coverThumbUrl : null;
          return (
            <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex gap-3">
                <CoverThumb cover={cover} label="" className="size-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                    <span>{t(`context.${entry.listenContext}`)}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <time dateTime={entry.createdAt}>
                        {new Date(entry.createdAt).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                      <ReactionGlyph reaction={entry.reaction} />
                    </span>
                  </div>
                  <div className="mt-1">
                    <TargetTitle
                      href={targetHref(entry.target.type, entry.target.id)}
                      label={entry.target.title}
                      artist={entry.target.subtitle}
                      artistHref={entry.target.artistId ? targetHref("artist", entry.target.artistId) : null}
                      layout="inline"
                    />
                  </div>
                  {body ? <ProsePanel body={body} variant="impression" clamp /> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasNext && (
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void handleLoadMore()}
          className="mt-4 self-center"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {loadError && (
        <span role="alert" className="mt-2 text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </>
  );

  if (!scrollable) return <div className="flex w-full flex-col">{list}</div>;

  return (
    <div
      role="region"
      aria-label={t("scrollRegionLabel")}
      tabIndex={0}
      className="themed-scrollbar flex max-h-[21rem] w-full flex-col overflow-y-auto pr-3 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {list}
    </div>
  );
}
