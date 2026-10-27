"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { useProgressSection } from "@/components/progress/ProgressSection";
import { ProgressSortSelect } from "@/components/progress/ProgressSortSelect";
import { sortByProgress } from "@/components/progress/progress-list-shared";
import {
  DEFAULT_FOLLOWING_FILTERS,
  FOLLOWING_SORTS,
  type FollowingFilters,
} from "@/components/progress/progress-tabs";
import { useProgressFilters } from "@/components/progress/use-progress-filters";
import { EmptyState } from "@/components/ui/EmptyState";
import { UndoToast } from "@/components/ui/UndoToast";
import { normalizeForSearch } from "@/components/artist-journey/artist-journey-list-shared";
import { setListTracking } from "@/lib/api/camino";
import { presentList } from "@/lib/list-presentation";
import type { TrackedListSummary } from "@/lib/api/schemas";

interface TrackedCaminosListProps {
  lists: TrackedListSummary[];
  /** Filtros leídos de la URL por la página (ya validados). */
  initialFilters?: Partial<FollowingFilters>;
}

/** Última lista que se dejó de seguir, con su posición para reponerla al deshacer. */
interface Untracked {
  list: TrackedListSummary;
  index: number;
  undoing: boolean;
  failed: boolean;
}

// Pestaña "Trackeados" de `/me/caminos`: buscador (título o dueño) + orden
// (recientes / más progreso), sin filtro de estado (no hay "Archivado" para
// una lista ajena) ni modo de vista (no es una curaduría propia — un único
// tratamiento de fila alcanza). Mismo criterio que "Guardadas" en /me/lists:
// más liviana que su contraparte propia porque el conjunto ya es homogéneo
// dentro de la pestaña.
//
// Desde refine-progress-page-phase1: los filtros viven en la URL (D5) y "Dejar de seguir" nombra la lista y ofrece
// deshacer (D3): desactivar el seguimiento conserva el guardado, así que deshacer es volver a activarlo. Desde
// redesign-progress-toolbar el orden usa el mismo selector y nombre ("Más avanzadas") que las otras pestañas y el total
// se informa a la sección.
export function TrackedCaminosList({ lists: initial, initialFilters }: TrackedCaminosListProps) {
  const t = useTranslations("camino");
  const locale = useLocale();
  const { reportTotal } = useProgressSection();
  const [filters, setFilter] = useProgressFilters(DEFAULT_FOLLOWING_FILTERS, initialFilters);
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [untracked, setUntracked] = useState<Untracked | null>(null);

  useEffect(() => setItems(initial), [initial]);
  useEffect(() => reportTotal("following", items.length), [items.length, reportTotal]);

  const visible = useMemo(() => {
    const q = normalizeForSearch(filters.q.trim());
    const filtered = q
      ? items.filter(
          (list) =>
            normalizeForSearch(list.title).includes(q) ||
            normalizeForSearch(list.owner.username).includes(q),
        )
      : items;
    if (filters.sort === "recent") return filtered;
    return sortByProgress(filtered);
  }, [items, filters]);

  async function handleUntrack(list: TrackedListSummary) {
    setBusyId(list.id);
    setError(null);
    try {
      await setListTracking(list.id, false);
      const index = items.findIndex((item) => item.id === list.id);
      setItems((current) => current.filter((item) => item.id !== list.id));
      setUntracked({ list, index, undoing: false, failed: false });
    } catch {
      setError(list.id);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUndo() {
    if (!untracked) return;
    const { list, index } = untracked;
    setUntracked({ ...untracked, undoing: true });
    try {
      await setListTracking(list.id, true);
      setItems((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, list);
        return next;
      });
      setUntracked(null);
    } catch {
      setUntracked({ ...untracked, undoing: false, failed: true });
    }
  }

  const dismissToast = useCallback(() => setUntracked(null), []);

  const toast = untracked ? (
    <UndoToast
      key={untracked.list.id}
      message={
        untracked.failed ? t("undoError") : t("untracked", { title: presentList(untracked.list, locale).title })
      }
      undoLabel={t("undo")}
      onUndo={untracked.failed ? undefined : () => void handleUndo()}
      onExpire={dismissToast}
      undoing={untracked.undoing}
    />
  ) : null;

  if (items.length === 0) {
    return (
      <div className="flex w-full flex-col gap-4">
        <EmptyState
          title={t("trackedListsHeading")}
          description={t("trackedEmpty")}
          action={
            <Link href="/caminos" className="font-data text-xs text-amber underline decoration-dotted hover:text-amber-hover">
              {t("discoverLists")}
            </Link>
          }
        />
        {toast}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          autoComplete="off"
          value={filters.q}
          onChange={(event) => setFilter("q", event.target.value)}
          placeholder={t("trackedSearchPlaceholder")}
          aria-label={t("trackedSearchPlaceholder")}
          className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:w-auto sm:min-w-[12rem] sm:flex-1"
        />
        <ProgressSortSelect
          value={filters.sort}
          options={FOLLOWING_SORTS}
          onChange={(value) => setFilter("sort", value)}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <ul className="flex w-full flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
          {visible.map((list) => {
            const shown = presentList(list, locale);
            const href =
              list.kind === "custom_journey" ? `/users/${list.owner.username}/caminos/${list.id}` : shown.href;
            return (
              <li key={list.id} className="flex flex-col gap-1 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <CoverThumb cover={list.coverThumbUrl} label="" className="size-10 shrink-0 rounded" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={href}
                      className="min-w-0 truncate font-display text-sm text-paper hover:text-amber"
                    >
                      {shown.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-[0.65rem] text-paper-muted">
                        {t("ownedBy", { username: list.owner.username })}
                      </span>
                      <ProgressBar
                        listened={list.progress.listenedCount}
                        selected={list.progress.selectedCount}
                        className="w-16"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === list.id}
                    onClick={() => void handleUntrack(list)}
                    aria-label={t("untrackLabel", { title: shown.title })}
                    className="min-h-8 shrink-0 rounded px-2 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:min-h-11"
                  >
                    {t("untrack")}
                  </button>
                </div>
                {error === list.id && (
                  <span role="alert" className="pl-[3.25rem] font-data text-xs text-danger">
                    {t("saveError")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {toast}
    </div>
  );
}
