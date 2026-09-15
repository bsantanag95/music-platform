"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ReleaseGroupCategorySchema, type ReleaseGroupCategory } from "@/lib/api/schemas";
import { normalizeForSearch } from "./artist-journey-list-shared";

export interface ArtistJourneyGroupableAlbum {
  id: string;
  title: string;
  category: ReleaseGroupCategory;
  firstReleaseYear: number | null;
}

interface ArtistJourneyAlbumGroupsProps<T extends ArtistJourneyGroupableAlbum> {
  albums: T[];
  selected: Set<string>;
  collapsed: Set<ReleaseGroupCategory>;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  onToggleAlbum: (albumId: string) => void;
  onToggleCategory: (albumIds: string[], allSelected: boolean) => void;
  onToggleCollapsed: (category: ReleaseGroupCategory) => void;
}

const CATEGORY_ORDER = ReleaseGroupCategorySchema.options;

// Chevron de colapsar/expandir por grupo — mismo lenguaje visual que
// `DiaryActivityList` (apunta hacia abajo expandido, hacia la derecha
// colapsado).
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Casillero "maestro" del grupo: checkbox real, con estado indeterminado
// cuando solo parte del grupo está marcada.
function GroupSelectAllCheckbox({
  allSelected,
  someSelected,
  label,
  onToggle,
}: {
  allSelected: boolean;
  someSelected: boolean;
  label: string;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={onToggle}
      aria-label={label}
      className="size-4 shrink-0 accent-amber"
    />
  );
}

// Selección de álbumes agrupada por categoría, colapsable, con estudio
// expandido por defecto y el resto colapsado — compartida entre la página de
// gestión (`ArtistJourneyManager`) y el modal de inicio
// (`ArtistJourneyStartModal`): misma UI, dos orígenes de datos distintos
// (`ArtistJourneyAlbum` con `selected` propio en un caso, `ReleaseGroup` de
// la discografía completa en el otro — de ahí el genérico, ambos comparten
// el subconjunto de campos que esta vista necesita). El buscador (openspec:
// add-artist-journey-album-search) es estado interno del componente — no
// escapa a los dos consumidores, ni se persiste entre aperturas.
export function ArtistJourneyAlbumGroups<T extends ArtistJourneyGroupableAlbum>({
  albums,
  selected,
  collapsed,
  categoryLabels,
  onToggleAlbum,
  onToggleCategory,
  onToggleCollapsed,
}: ArtistJourneyAlbumGroupsProps<T>) {
  const t = useTranslations("artistJourney");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeForSearch(query.trim());
  const searching = normalizedQuery !== "";

  const grouped = new Map<ReleaseGroupCategory, T[]>();
  for (const album of albums) {
    const list = grouped.get(album.category) ?? [];
    list.push(album);
    grouped.set(album.category, list);
  }

  const hasAnyMatch =
    !searching || albums.some((a) => normalizeForSearch(a.title).includes(normalizedQuery));

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("albumSearch.placeholder")}
        aria-label={t("albumSearch.placeholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />

      {searching && !hasAnyMatch && (
        <p className="font-body text-xs text-paper-muted">{t("albumSearch.noResults")}</p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const groupAlbums = grouped.get(category);
        if (!groupAlbums?.length) return null;
        const visibleAlbums = searching
          ? groupAlbums.filter((a) => normalizeForSearch(a.title).includes(normalizedQuery))
          : groupAlbums;
        if (searching && visibleAlbums.length === 0) return null;
        // Mientras se busca, la visibilidad la decide la búsqueda, no el
        // colapso guardado — se ignora `collapsed` sin mutarlo, para que al
        // vaciar la búsqueda el estado previo vuelva tal cual estaba (D1 de
        // design.md).
        const isCollapsed = searching ? false : collapsed.has(category);
        const selectedInGroup = groupAlbums.filter((a) => selected.has(a.id)).length;
        const allSelected = selectedInGroup === groupAlbums.length;
        const someSelected = selectedInGroup > 0 && !allSelected;

        return (
          <div key={category} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={searching}
                aria-expanded={!isCollapsed}
                onClick={() => onToggleCollapsed(category)}
                className="flex min-w-0 items-center gap-1.5 text-paper-muted transition-colors hover:text-paper disabled:cursor-default disabled:opacity-60 disabled:hover:text-paper-muted"
              >
                <ChevronIcon expanded={!isCollapsed} />
                <span className="truncate font-data text-xs uppercase tracking-wider">
                  {categoryLabels[category]}
                </span>
                <span className="shrink-0 font-data text-xs text-paper-muted">
                  ({selectedInGroup}/{groupAlbums.length})
                </span>
              </button>
              <GroupSelectAllCheckbox
                allSelected={allSelected}
                someSelected={someSelected}
                label={t(allSelected ? "deselectAllAria" : "selectAllAria", {
                  category: categoryLabels[category],
                })}
                onToggle={() =>
                  onToggleCategory(
                    groupAlbums.map((a) => a.id),
                    allSelected,
                  )
                }
              />
            </div>

            {!isCollapsed && (
              <ul className="flex flex-col divide-y divide-ink-border border-t border-ink-border">
                {visibleAlbums.map((album) => (
                  <li key={album.id} className="flex items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(album.id)}
                      onChange={() => onToggleAlbum(album.id)}
                      aria-label={t("toggleAlbum", { title: album.title })}
                      className="size-4 shrink-0 accent-amber"
                    />
                    <span className="min-w-0 flex-1 truncate font-body text-sm text-paper">
                      {album.title}
                    </span>
                    {album.firstReleaseYear !== null && (
                      <span className="shrink-0 font-data text-xs text-paper-muted">
                        {album.firstReleaseYear}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
