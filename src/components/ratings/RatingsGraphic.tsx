"use client";

import { RatingTile } from "./RatingTile";
import type { RatingsRendererProps } from "./ratings-view";

// Modo Gráfico: pared de carátulas con la nota al pasar el cursor. Más columnas que la
// pared de Favoritos porque el contenedor se ensancha en este modo.
export function RatingsGraphic({ entries, actions, display }: RatingsRendererProps) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {entries.map((entry) => (
        <RatingTile
          key={entry.id}
          entry={entry}
          onEdit={actions.onEdit}
          showArtist={display.showArtist}
          showType={display.showType}
        />
      ))}
    </ul>
  );
}
