"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pushRecentSearch } from "@/lib/search/recent-searches";
import { advancedSearchHref } from "@/services/catalog/search/filters";
import { ScopedSearchField } from "./ScopedSearchField";
import type { SearchType } from "./search-types";

interface SearchFormProps {
  // Valores con los que llega `/search?type=&q=` — solo prellenan el campo.
  // La búsqueda la ejecuta la página como Server Component.
  initialQuery?: string;
  initialType?: SearchType;
}

// Buscador de la página /search: la misma pieza que el Header, en su variante
// completa. Arranca con el tipo de la URL, así que refinar una búsqueda
// conserva el tipo elegido (openspec: redesign-scoped-search). Al lado, el
// enlace a la búsqueda avanzada con el tipo y el texto cargados (openspec:
// redesign-advanced-search).
export function SearchForm({ initialQuery = "", initialType = "artist" }: SearchFormProps) {
  const t = useTranslations("catalog.search.advanced");
  return (
    <div className="w-full max-w-xl">
      <ScopedSearchField
        // Remonta al cambiar la URL (enlace de otro tipo, búsqueda reciente):
        // el campo refleja siempre el tipo y el texto de la búsqueda en curso.
        key={`${initialType}|${initialQuery}`}
        variant="full"
        initialType={initialType}
        initialQuery={initialQuery}
        onSubmitSearch={(query, type) => pushRecentSearch(query, type)}
        trailing={
          initialType === "user" ? null : (
            <Link
              href={advancedSearchHref(initialType, initialQuery)}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded border border-ink-border px-4 font-display text-sm text-paper-muted transition-colors hover:border-amber/60 hover:text-paper"
            >
              {t("headerLink")}
            </Link>
          )
        }
      />
    </div>
  );
}
