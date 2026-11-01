"use client";

import { useId, useState } from "react";
import { pushRecentSearch } from "@/lib/search/recent-searches";
import { activeFilterCount, filtersToParams, type AdvancedFilters } from "@/services/catalog/search/filters";
import { AdvancedSearchPanel, AdvancedSearchToggle, hasAdvancedFilters } from "./AdvancedSearchPanel";
import { ScopedSearchField } from "./ScopedSearchField";
import type { SearchType } from "./search-types";

interface SearchFormProps {
  // Valores con los que llega `/search?type=&q=` — solo prellenan el campo.
  // La búsqueda la ejecuta la página como Server Component.
  initialQuery?: string;
  initialType?: SearchType;
  /** Filtros del panel activos en la URL (openspec: add-advanced-search-phase1). */
  filters?: AdvancedFilters;
  /** Filtros de pastilla activos (`artistType`, `category`): el panel y un nuevo envío los conservan. */
  pillParams?: Record<string, string>;
  /** `filters=1` (enlace "Búsqueda avanzada" del Header): el panel arranca abierto. */
  panelOpen?: boolean;
}

// Buscador de la página /search: la misma pieza que el Header, en su variante
// completa. Arranca con el tipo de la URL, así que refinar una búsqueda
// conserva el tipo elegido (openspec: redesign-scoped-search). Al lado, el
// botón "Filtros" abre el panel de búsqueda avanzada.
export function SearchForm({
  initialQuery = "",
  initialType = "artist",
  filters = {},
  pillParams = {},
  panelOpen = false,
}: SearchFormProps) {
  const panelId = useId();
  const count = activeFilterCount(filters);
  const [open, setOpen] = useState(panelOpen || count > 0);
  const withPanel = hasAdvancedFilters(initialType) && initialQuery !== "";

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <ScopedSearchField
        // Remonta al cambiar la URL (enlace de otro tipo, búsqueda reciente):
        // el campo refleja siempre el tipo y el texto de la búsqueda en curso.
        key={`${initialType}|${initialQuery}`}
        variant="full"
        initialType={initialType}
        initialQuery={initialQuery}
        onSubmitSearch={(query, type) => pushRecentSearch(query, type)}
        persistParams={{ ...pillParams, ...filtersToParams(filters) }}
        trailing={
          withPanel ? (
            <AdvancedSearchToggle open={open} onToggle={() => setOpen((value) => !value)} count={count} panelId={panelId} />
          ) : null
        }
      />
      {withPanel ? (
        <AdvancedSearchPanel
          // Remonta con otra URL: los campos muestran los filtros aplicados.
          key={`${initialType}|${initialQuery}|${JSON.stringify(filters)}`}
          id={panelId}
          hidden={!open}
          type={initialType}
          query={initialQuery}
          filters={filters}
          preserved={pillParams}
        />
      ) : null}
    </div>
  );
}
