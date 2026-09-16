"use client";

import { FavoriteTile } from "./FavoriteTile";
import type { FavoritesRendererProps } from "./favorites-items-view";

// Modo Detallada: la ficha completa (`FavoriteTile`) con carátula/placa,
// título, artista y controles de audiencia/quitar. Modo por defecto, mismo
// tratamiento que tenía el muro antes de sumar los tres modos.
export function FavoritesDetailed({ favorites, actions }: FavoritesRendererProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {favorites.map((favorite) => (
        <FavoriteTile
          key={favorite.id}
          favorite={favorite}
          readOnly={actions.readOnly}
          selectionMode={actions.selectionMode}
          selected={actions.selectedIds.has(favorite.id)}
          busy={actions.busyId === favorite.id || actions.bulkBusy}
          onToggleSelect={actions.onToggleSelect}
          onAudienceChange={actions.onAudienceChange}
          onRemove={actions.onRemove}
        />
      ))}
    </div>
  );
}
