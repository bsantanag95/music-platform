"use client";

import { RatingTile } from "./RatingTile";
import type { RatingsRendererProps } from "./ratings-view";

// Modo Gráfico: pared de carátulas con la nota al pasar el cursor. Hasta seis columnas: el
// contenedor tiene el mismo ancho en los tres modos.
export function RatingsGraphic({ entries, actions, display, priorityIds }: RatingsRendererProps) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
