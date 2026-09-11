"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "@/i18n/navigation";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { entityTypeKey } from "./lists-shared";
import type { PublicListSort } from "./community-filters";
import { COMMUNITY_ENTITY_TYPES, PUBLIC_LIST_SORTS_UI } from "./community-filters";

// Toolbar de exploración de `/lists` (cambio rework-public-lists-surface).
// Siempre visible; escribe el estado en la URL (`?q&type&sort`) para que sea
// enlazable y sobreviva a la recarga. El texto se debouncea 300 ms; los selects
// navegan al instante. Cualquier filtro activo lleva la página al modo explorar
// (ver `page.tsx`).
export function CommunityListsToolbar() {
  const t = useTranslations("lists");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentSort: PublicListSort =
    (searchParams.get("sort") as PublicListSort | null) ?? "recent";
  const [searchInput, setSearchInput] = useState(currentQ);

  const update = useCallback(
    (changes: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    if (searchInput === currentQ) return;
    const id = window.setTimeout(() => {
      update({ q: searchInput.trim() || undefined });
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput, currentQ, update]);

  const hasFilters = Boolean(
    currentQ || currentType || searchParams.has("sort") || searchInput.trim(),
  );

  return (
    <form
      role="search"
      aria-label={t("community.searchLabel")}
      onSubmit={(event) => event.preventDefault()}
      className="flex w-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3"
    >
      <input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={t("community.searchPlaceholder")}
        aria-label={t("community.searchLabel")}
        className="w-full rounded-md border border-ink-border bg-ink px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FilterSelect
          value={currentType}
          onChange={(value) => update({ type: value || undefined })}
          ariaLabel={t("typeFilterLabel")}
          widthClassName="w-[20ch]"
        >
          <option value="">{t("filterAllTypes")}</option>
          {COMMUNITY_ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(entityTypeKey(type))}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={currentSort}
          onChange={(value) => update({ sort: value })}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[13ch]"
        >
          {PUBLIC_LIST_SORTS_UI.map((sort) => (
            <option key={sort} value={sort}>
              {sort === "popular" ? t("community.sortPopular") : t("sort.recent")}
            </option>
          ))}
        </FilterSelect>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              update({ q: undefined, type: undefined, sort: undefined });
            }}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
