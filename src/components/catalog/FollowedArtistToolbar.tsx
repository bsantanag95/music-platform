"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";

export type FollowedArtistSort = "recent" | "alpha";

interface FollowedArtistToolbarProps {
  searchInput: string;
  onSearchInput: (value: string) => void;
  sort: FollowedArtistSort;
  onSortChange: (sort: FollowedArtistSort) => void;
}

// Buscador + orden de "Artistas que sigo". A diferencia de
// `CollectionToolbar`/`FavoritesToolbar`, opera enteramente en el cliente
// sobre la lista ya cargada (el servicio no pagina más allá de la primera
// carga hoy), así que no hay debounce ni round-trip al servidor.
export function FollowedArtistToolbar({
  searchInput,
  onSearchInput,
  sort,
  onSortChange,
}: FollowedArtistToolbarProps) {
  const t = useTranslations("users.artistsFollowed");

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        type="search"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex items-center gap-1">
        <span aria-hidden className="font-data text-xs text-paper-muted">
          {t("sortLabel")}
        </span>
        <FilterSelect
          value={sort}
          onChange={(value) => onSortChange(value as FollowedArtistSort)}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[10ch]"
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="alpha">{t("sort.alpha")}</option>
        </FilterSelect>
      </div>
    </div>
  );
}
