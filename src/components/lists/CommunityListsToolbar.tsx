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
    // Una sola fila (buscador que se estira + filtros a la derecha), sin caja propia: antes era un panel con
    // el buscador a todo el ancho y los filtros sueltos en una segunda fila.
    <form
      role="search"
      aria-label={t("community.searchLabel")}
      onSubmit={(event) => event.preventDefault()}
      className="flex w-full flex-wrap items-end gap-x-4 gap-y-2"
    >
      <div className="relative min-w-[14rem] flex-1">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("community.searchPlaceholder")}
          aria-label={t("community.searchLabel")}
          className="w-full rounded-md border border-ink-border bg-ink-surface py-2 pl-9 pr-3.5 font-data text-sm text-paper transition-colors placeholder:text-paper-muted focus:border-paper-muted/60"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FilterSelect
          value={currentType}
          onChange={(value) => update({ type: value || undefined })}
          ariaLabel={t("typeFilterLabel")}
          widthClassName="w-[22ch]"
          variant="boxed"
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
          widthClassName="w-[15ch]"
          variant="boxed"
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
