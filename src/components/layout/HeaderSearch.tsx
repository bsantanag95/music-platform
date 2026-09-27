"use client";

import { ScopedSearchField } from "@/components/catalog/ScopedSearchField";

interface HeaderSearchProps {
  /** Ocupa todo el ancho (panel móvil del Header). */
  fluid?: boolean;
}

// Buscador compacto y persistente del Header (openspec/specs/header-search,
// cambio redesign-scoped-search). Arranca siempre en Artistas y, al enviar,
// navega a /search?type=&q= — la redirección por coincidencia exacta única la
// decide la página, no el Header. Una sugerencia elegida abre la entidad
// directo. Tras navegar el campo se vacía y vuelve a Artistas: el Header vive
// en el layout y no se desmonta, así que sin esto la última búsqueda quedaba
// pegada en el campo al pasar a otra sección.
export function HeaderSearch({ fluid = false }: HeaderSearchProps) {
  return <ScopedSearchField variant="compact" resetAfterNavigate fluid={fluid} />;
}
