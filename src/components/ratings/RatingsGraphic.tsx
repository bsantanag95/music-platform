"use client";

import { RatingTile } from "./RatingTile";
import type { RatingsRendererProps } from "./ratings-view";

// Modo Gráfico: pared de carátulas con su leyenda (título, detalle, estrellas y puntaje) siempre visible.
// Hasta seis columnas: el contenedor tiene el mismo ancho en los tres modos.
export function RatingsGraphic({ entries, actions, display, priorityIds }: RatingsRendererProps) {
  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {entries.map((entry) => (
        <RatingTile
          key={entry.id}
          entry={entry}
          onEdit={actions.onEdit}
          showArtist={display.showArtist}
          showType={display.showType}
          priority={priorityIds?.has(entry.id) ?? false}
        />
      ))}
    </ul>
  );
}
