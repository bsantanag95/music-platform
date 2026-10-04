import type { MyRatingEntry } from "@/lib/api/schemas";

// Acciones sobre las valoraciones de una sección, resueltas por `MyRatingsList`.
// Compartidas por los tres modos de visualización.
export interface RatingsRowActions {
  /** Actualiza la entrada en el lugar (cambio de estrellas inline). */
  onUpdate: (id: string, entry: MyRatingEntry) => void;
  /** Abre el diálogo de puntaje, elevado al orquestador, con la valoración de la entrada. */
  onEdit: (entry: MyRatingEntry) => void;
}

// Qué datos repetidos conviene ocultar según la agrupación: bajo "Por artista" el encabezado ya dice
// el artista y el subencabezado el tipo; bajo "Por tipo" el encabezado ya dice el tipo. Solo
// "Sin agrupar" muestra ambos en cada entrada.
export interface RatingsDisplay {
  showArtist: boolean;
  showType: boolean;
}

export interface RatingsRendererProps {
  entries: MyRatingEntry[];
  actions: RatingsRowActions;
  display: RatingsDisplay;
}
