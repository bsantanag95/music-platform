"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
} from "@/lib/search/recent-searches";

// Búsquedas recientes bajo el formulario cuando `/search` llega sin consulta.
// Se hidrata en el cliente: localStorage no existe en el servidor, así que el
// primer render no muestra nada y `useEffect` completa la lista. No renderiza
// ningún contenedor si no hay entradas.
export function RecentSearches() {
  const t = useTranslations("catalog");
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    setQueries(readRecentSearches());
  }, []);

  if (queries.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-3" aria-label={t("search.recent.heading")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm text-paper-muted">
          {t("search.recent.heading")}
        </h2>
        <button
          type="button"
          onClick={() => setQueries(clearRecentSearches())}
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("search.recent.clearAll")}
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-ink-border">
        {queries.map((query) => (
          <li
            key={query}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="min-w-0 truncate font-body text-sm text-paper transition-colors hover:text-amber"
            >
              {query}
            </Link>
            <button
              type="button"
              aria-label={t("search.recent.remove", { query })}
              onClick={() => setQueries(removeRecentSearch(query))}
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
