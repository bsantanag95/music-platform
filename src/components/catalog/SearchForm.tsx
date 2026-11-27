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
  /** Con resultados debajo: etiqueta oculta (openspec: refine-search-results-phase2). */
  compact?: boolean;
}

// Buscador de la página /search: la misma pieza que el Header, en su variante
// completa. Arranca con el tipo de la URL, así que refinar una búsqueda
// conserva el tipo elegido (openspec: redesign-scoped-search). Al lado, el
// enlace a la búsqueda avanzada con el tipo y el texto cargados (openspec:
// redesign-advanced-search), como texto bajo el campo: a lo ancho competía con
// "Buscar" (openspec: refine-search-results-phase2). Desde redesign-search-phase1 es el único buscador visible de la página
// en escritorio (el del Header se oculta en /search): campo grande (`size="page"`), alineado con la columna de resultados.
export function SearchForm({ initialQuery = "", initialType = "artist", compact = false }: SearchFormProps) {
  const t = useTranslations("catalog.search.advanced");
  return (
    <div className="flex w-full max-w-[54rem] flex-col gap-2">
      <ScopedSearchField
        // Remonta al cambiar la URL (enlace de otro tipo, búsqueda reciente):
        // el campo refleja siempre el tipo y el texto de la búsqueda en curso.
        key={`${initialType}|${initialQuery}`}
        variant="full"
        size="page"
        initialType={initialType}
        initialQuery={initialQuery}
        onSubmitSearch={(query, type) => pushRecentSearch(query, type)}
        labelHidden={compact}
      />
      {initialType === "user" ? null : (
        <Link
          href={advancedSearchHref(initialType, initialQuery)}
          className="self-end font-data text-xs text-paper-muted transition-colors hover:text-amber"
        >
          {t("headerLink")} →
        </Link>
      )}
    </div>
  );
}
