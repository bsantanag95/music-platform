"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from "@/lib/search/recent-searches";
import { searchHref } from "./search-types";
import { SearchTypeIcon } from "./SearchTypeIcon";

// Búsquedas recientes bajo el formulario cuando `/search` llega sin consulta.
// Se hidrata en el cliente: localStorage no existe en el servidor, así que el
// primer render no muestra nada y `useEffect` completa la lista. No renderiza
// ningún contenedor si no hay entradas. Cada entrada vuelve a su tipo.
export function RecentSearches() {
  const t = useTranslations("catalog");
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setSearches(readRecentSearches());
  }, []);

  if (searches.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-3" aria-label={t("search.recent.heading")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm text-paper-muted">
          {t("search.recent.heading")}
        </h2>
        <button
          type="button"
          onClick={() => setSearches(clearRecentSearches())}
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("search.recent.clearAll")}
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-ink-border">
        {searches.map((search) => (
          <li
            key={`${search.type}-${search.q}`}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <Link
              href={searchHref(search.type, search.q)}
              className="group flex min-w-0 items-center gap-2.5"
            >
              <span className="text-paper-muted" aria-hidden>
                <SearchTypeIcon type={search.type} className="size-3.5" />
              </span>
              <span className="min-w-0 truncate font-body text-sm text-paper transition-colors group-hover:text-amber">
                {search.q}
              </span>
              <span className="sr-only">{`, ${t(`search.types.${search.type}`)}`}</span>
            </Link>
            <button
              type="button"
              aria-label={t("search.recent.remove", { query: search.q })}
              onClick={() => setSearches(removeRecentSearch(search))}
              className="shrink-0 font-data text-xs text-paper-muted transition-colors hover:text-danger"
            >
              {t("search.recent.removeShort")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
