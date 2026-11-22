"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "@/i18n/navigation";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { entityTypeKey } from "./lists-shared";
import type { PublicListSort } from "./community-filters";
import { COMMUNITY_ENTITY_TYPES, COMMUNITY_LIST_THEMES, PUBLIC_LIST_SORTS_UI } from "./community-filters";

// Toolbar de exploración de `/lists` (cambio rework-public-lists-surface).
// Siempre visible; escribe el estado en la URL (`?q&type&theme&sort`) para que sea
// enlazable y sobreviva a la recarga. El texto se debouncea 300 ms; los selects
// navegan al instante. Cualquier filtro activo lleva la página al modo explorar
// (ver `page.tsx`).
export function CommunityListsToolbar() {
  const t = useTranslations("lists");
  const tTheme = useTranslations("lists.theme");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentType = searchParams.get("type") ?? "";
  // Un tema desconocido en la URL se ignora (openspec: add-list-themes-phase1).
  const rawTheme = searchParams.get("theme") ?? "";
  const currentTheme = (COMMUNITY_LIST_THEMES as readonly string[]).includes(rawTheme) ? rawTheme : "";
  const sortParam = searchParams.get("sort") as PublicListSort | null;
  // En la vitrina el orden no tiene valor (redesign-lists-page, D4): mostrar "Recientes" daba a entender que toda la página
  // estaba ordenada así. En explorar sin `sort`, el orden efectivo es el cronológico.
  const inExplore = Boolean(currentQ || currentType || currentTheme || sortParam);
  const currentSort: PublicListSort | "" = sortParam ?? (inExplore ? "recent" : "");
  const [searchInput, setSearchInput] = useState(currentQ);
  // Último `q` que escribió este campo. Si la URL cambia a otro valor por fuera (el "Limpiar filtros" del rótulo de la
  // grilla), el campo se sincroniza; si no, el debounce volvería a escribir el texto viejo en la URL.
  const pushedQ = useRef(currentQ);

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
      pushedQ.current = searchInput.trim();
      update({ q: searchInput.trim() || undefined });
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput, currentQ, update]);

  useEffect(() => {
    if (currentQ === pushedQ.current) return;
    pushedQ.current = currentQ;
    setSearchInput(currentQ);
  }, [currentQ]);

  const typeOptions: { value: string; label: string }[] = [
    { value: "", label: t("community.typeAll") },
    ...COMMUNITY_ENTITY_TYPES.map((type) => ({ value: type, label: t(entityTypeKey(type)) })),
  ];

  return (
    // Buscador, tipo y orden (redesign-lists-page D8; redesign-lists-phase1): el tipo es un control segmentado de 44 px. Desde
    // `lg` los tres van en una fila; por debajo, buscador y orden arriba y los cuatro segmentos en su propia fila, a todo el
    // ancho y sin desplazamiento (antes eran chips de 28 px que se salían de la pantalla junto al orden).
    <form
      role="search"
      aria-label={t("community.searchLabel")}
      onSubmit={(event) => event.preventDefault()}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
    >
      <div className="relative w-full">
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
          className="h-11 w-full rounded-md border border-ink-border bg-ink-surface pl-9 pr-3.5 font-data text-sm text-paper transition-colors placeholder:text-paper-muted focus:border-paper-muted/60"
        />
      </div>
        <div
          role="group"
          aria-label={t("typeFilterLabel")}
          className="col-span-2 row-start-2 grid grid-cols-4 overflow-hidden rounded-md bg-ink-surface ring-1 ring-inset ring-ink-border lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:flex"
        >
          {typeOptions.map((option) => {
            const selected = option.value === currentType;
            return (
              <button
                key={option.value || "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ type: option.value || undefined })}
                className={`inline-flex h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-md px-2 font-display text-[0.9375rem] transition-colors sm:px-3.5 ${
                  selected ? "bg-paper text-ink" : "text-paper-muted hover:text-paper"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {/* Tema (openspec: add-list-themes-phase1): desde `lg` entre los segmentos y el orden; por debajo, fila propia. */}
        <div className="col-span-2 row-start-3 lg:col-span-1 lg:col-start-3 lg:row-start-1">
          <FilterSelect
            value={currentTheme}
            onChange={(value) => update({ theme: value || undefined })}
            ariaLabel={tTheme("filterLabel")}
            widthClassName="h-11 w-full lg:w-[22ch]"
            variant="boxed"
          >
            <option value="">{tTheme("filterAll")}</option>
            {COMMUNITY_LIST_THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {tTheme(`names.${theme}`)}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="col-start-2 row-start-1 lg:col-start-4">
        <FilterSelect
          value={currentSort}
          onChange={(value) => update({ sort: value || undefined })}
          ariaLabel={t("sortLabel")}
          widthClassName="h-11 w-[15ch]"
          variant="boxed"
        >
          {currentSort === "" ? (
            <option value="" disabled hidden>
              {t("sortLabel")}
            </option>
          ) : null}
          {PUBLIC_LIST_SORTS_UI.map((sort) => (
            <option key={sort} value={sort}>
              {sort === "popular" ? t("community.sortPopular") : t("sort.recent")}
            </option>
          ))}
        </FilterSelect>
        </div>
        {/* "Limpiar filtros" vive en el rótulo de la grilla de explorar (D4), que solo existe con filtros activos. */}
    </form>
  );
}
