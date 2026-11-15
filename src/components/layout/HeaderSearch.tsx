"use client";

import { ScopedSearchField } from "@/components/catalog/ScopedSearchField";

interface HeaderSearchProps {
  /** Ocupa todo el ancho (fila de búsqueda del Header en pantallas angostas). */
  fluid?: boolean;
  /**
   * `hero`: el mismo buscador en grande para el hero de Inicio sin sesión (campo alto y
   * botón "Buscar" visible). Misma navegación, sugerencias y reinicio que en el Header.
   */
  size?: "header" | "hero";
  /** Lleva el foco al campo al montarse. */
  autoFocus?: boolean;
  /** Aviso de que el buscador navegó. */
  onNavigate?: () => void;
}

// Buscador compacto y persistente del Header (openspec/specs/header-search,
// cambio redesign-scoped-search). Arranca siempre en Artistas y, al enviar,
// navega a /search?type=&q= — la redirección por coincidencia exacta única la
// decide la página, no el Header. Una sugerencia elegida abre la entidad
// directo. Tras navegar el campo se vacía y vuelve a Artistas: el Header vive
// en el layout y no se desmonta, así que sin esto la última búsqueda quedaba
// pegada en el campo al pasar a otra sección. El hero de Inicio sin sesión usa
// este mismo componente (`size="hero"`, redesign-anon-home-phase1) para que las
// dos entradas no diverjan.
export function HeaderSearch({ fluid = false, size = "header", autoFocus, onNavigate }: HeaderSearchProps) {
  if (size === "hero") {
    return (
      <ScopedSearchField
        variant="full"
        size="large"
        labelHidden
        resetAfterNavigate
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <ScopedSearchField
      variant="compact"
      resetAfterNavigate
      fluid={fluid}
      autoFocus={autoFocus}
      onNavigate={onNavigate}
    />
  );
}
