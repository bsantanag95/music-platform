"use client";

import { MyRatingRow } from "./MyRatingRow";
import type { RatingsRendererProps } from "./ratings-view";

// Modo Detallada: la fila completa de la biblioteca (`MyRatingRow`) con carátula, título,
// artista, tipo, año, estrellas editables y puntaje. Modo por defecto: es el tratamiento que
// tenía la página antes de sumar los tres modos.
export function RatingsDetailed({ entries, actions, display }: RatingsRendererProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => (
        <MyRatingRow
          key={entry.id}
          entry={entry}
          onUpdate={actions.onUpdate}
          onEdit={actions.onEdit}
          showArtist={display.showArtist}
          showType={display.showType}
        />
      ))}
    </div>
  );
}
