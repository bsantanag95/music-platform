"use client";

import { pushRecentSearch } from "@/lib/search/recent-searches";
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
// conserva el tipo elegido (openspec: redesign-scoped-search).
export function SearchForm({ initialQuery = "", initialType = "artist" }: SearchFormProps) {
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
      />
    </div>
  );
}
