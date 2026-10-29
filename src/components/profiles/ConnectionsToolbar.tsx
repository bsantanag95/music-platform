"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import {
  CONNECTION_SEGMENTS,
  type ConnectionSegment,
  type ConnectionSegmentCounts,
  type ConnectionSort,
} from "@/services/social/connection-filters";

interface ConnectionsToolbarProps {
  kind: "followers" | "following";
  searchInput: string;
  onSearchInput: (value: string) => void;
  sort: ConnectionSort;
  onSortChange: (sort: ConnectionSort) => void;
  segment: ConnectionSegment;
  onSegmentChange: (segment: ConnectionSegment) => void;
  /** Solo en las vistas propias (D4). */
  segmentCounts?: ConnectionSegmentCounts;
}

// Búsqueda, orden y segmentos de Seguidos / Seguidores (openspec: redesign-connections-toolbar). Misma forma que la
// barra de `/me/artists`: buscador que se estira, orden en caja con ancho propio y segmentos con su cifra, que en un
// teléfono ocupan el ancho y llevan la cifra bajo la etiqueta.
export function ConnectionsToolbar({
  kind,
  searchInput,
  onSearchInput,
  sort,
  onSortChange,
  segment,
  onSegmentChange,
  segmentCounts,
}: ConnectionsToolbarProps) {
  const t = useTranslations("users.connections");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          autoComplete="off"
          value={searchInput}
          onChange={(event) => onSearchInput(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="min-w-0 flex-1 basis-56 rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted [@media(pointer:coarse)]:min-h-11"
        />
        <FilterSelect
          value={sort}
          onChange={(value) => onSortChange(value as ConnectionSort)}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[18ch]"
          variant="boxed"
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="name">{t("sort.name")}</option>
        </FilterSelect>
      </div>
      {segmentCounts ? (
        <div
          role="group"
          aria-label={t("segmentLabel")}
          className="flex w-full items-stretch gap-0.5 rounded-md border border-ink-border p-0.5 sm:w-auto sm:gap-1 sm:self-start"
        >
          {CONNECTION_SEGMENTS.map((value) => {
            const selected = segment === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                disabled={!selected && segmentCounts[value] === 0}
                onClick={() => {
                  if (!selected) onSegmentChange(value);
                }}
                className={`inline-flex min-w-0 flex-1 flex-col items-center justify-center whitespace-nowrap rounded px-1 py-1 font-data text-xs leading-tight transition-colors disabled:opacity-40 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5 [@media(pointer:coarse)]:min-h-11 ${
                  selected ? "bg-amber/10 text-amber" : "text-paper-muted enabled:hover:text-paper"
                }`}
              >
                {t(`segment.${kind}.${value}`)}{" "}
                <span className={selected ? "text-amber/80" : "text-paper-muted/70"}>{segmentCounts[value]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
