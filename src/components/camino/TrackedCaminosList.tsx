"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { normalizeForSearch } from "@/components/artist-journey/artist-journey-list-shared";
import { setListTracking } from "@/lib/api/camino";
import type { TrackedListSummary } from "@/lib/api/schemas";

type TrackedSort = "recent" | "progress";

function progressRatio(progress: { selectedCount: number; listenedCount: number }): number {
  return progress.selectedCount > 0 ? progress.listenedCount / progress.selectedCount : 0;
}

interface TrackedCaminosListProps {
  lists: TrackedListSummary[];
}

// Pestaña "Trackeados" de `/me/caminos`: buscador (título o dueño) + orden
// (recientes / más progreso), sin filtro de estado (no hay "Archivado" para
// una lista ajena) ni modo de vista (no es una curaduría propia — un único
// tratamiento de fila alcanza). Mismo criterio que "Guardadas" en /me/lists:
// más liviana que su contraparte propia porque el conjunto ya es homogéneo
// dentro de la pestaña.
export function TrackedCaminosList({ lists: initial }: TrackedCaminosListProps) {
  const t = useTranslations("camino");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TrackedSort>("recent");
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const filtered = q
      ? items.filter(
          (list) =>
            normalizeForSearch(list.title).includes(q) ||
            normalizeForSearch(list.owner.username).includes(q),
        )
      : items;
    if (sort === "recent") return filtered;
    return [...filtered].sort((a, b) => progressRatio(b.progress) - progressRatio(a.progress));
  }, [items, query, sort]);

  async function handleUntrack(listId: string) {
    setBusyId(listId);
    setError(null);
    try {
      await setListTracking(listId, false);
      setItems((current) => current.filter((item) => item.id !== listId));
    } catch {
      setError(listId);
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState title={t("trackedListsHeading")} description={t("trackedEmpty")} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trackedSearchPlaceholder")}
          aria-label={t("trackedSearchPlaceholder")}
          className="w-full min-w-[11rem] rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:max-w-xs"
        />
        <FilterSelect
          value={sort}
          onChange={(value) => setSort(value as TrackedSort)}
          ariaLabel={t("trackedSortLabel")}
          widthClassName="w-[15ch]"
        >
          <option value="recent">{t("trackedSort.recent")}</option>
          <option value="progress">{t("trackedSort.progress")}</option>
        </FilterSelect>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <ul className="flex w-full flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
          {visible.map((list) => {
            const ratio = progressRatio(list.progress);
            const href =
              list.kind === "custom_journey"
                ? `/users/${list.owner.username}/caminos/${list.id}`
                : `/users/${list.owner.username}/lists/${list.id}`;
            return (
              <li key={list.id} className="flex items-center gap-3 px-3 py-2.5">
                <CoverThumb cover={list.coverThumbUrl} label="" className="size-10 shrink-0 rounded" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={href}
                    className="min-w-0 truncate font-display text-sm text-paper hover:text-amber"
                  >
                    {list.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="font-data text-[0.65rem] text-paper-muted">
                      {t("ownedBy", { username: list.owner.username })}
                    </span>
                    {list.progress.selectedCount > 0 && (
                      <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-ink-border">
                        <div
                          className="h-full rounded-full bg-petrol"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === list.id}
                  onClick={() => void handleUntrack(list.id)}
                  className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                >
                  {t("trackingOn")}
                </button>
                {error === list.id && (
                  <span role="alert" className="font-data text-xs text-danger">
                    {t("saveError")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
