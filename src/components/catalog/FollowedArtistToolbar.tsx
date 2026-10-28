"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { FollowedArtistSort } from "./followed-artist-filters";

export type { FollowedArtistSort };

interface FollowedArtistToolbarProps {
  searchInput: string;
  onSearchInput: (value: string) => void;
  sort: FollowedArtistSort;
  onSortChange: (sort: FollowedArtistSort) => void;
}

// Buscador + orden de "Artistas que sigo". Opera enteramente en el cliente sobre la lista completa, así que no hay
// debounce ni round-trip al servidor; los valores viajan en la URL desde `FollowedArtistList`. El orden va en caja y
// con ancho propio para que "Recientes" no se corte en móvil (refine-artists-page-phase1).
export function FollowedArtistToolbar({
  searchInput,
  onSearchInput,
  sort,
  onSortChange,
}: FollowedArtistToolbarProps) {
  const t = useTranslations("users.artistsFollowed");

  return (
    <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-2">
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
        onChange={(value) => onSortChange(value as FollowedArtistSort)}
        ariaLabel={t("sortLabel")}
        widthClassName="w-[24ch]"
        variant="boxed"
      >
        <option value="recent">{t("sort.recent")}</option>
        <option value="alpha">{t("sort.alpha")}</option>
        <option value="release">{t("sort.release")}</option>
      </FilterSelect>
    </div>
  );
}
