// Tipos y reglas puras de "Tu huella en el género" (openspec: redesign-genre-page, capability
// `genre-page-personal`). Sin acceso a base de datos: los consume tanto el servicio (`personal.ts`)
// como el componente.

export interface GenreFootprintFavorite {
  id: string;
  title: string;
  stars: number;
}

export interface GenreFootprint {
  /** Álbumes del género o de sus subgéneros que la persona valoró. */
  ratedCount: number;
  /** Media de sus estrellas; `null` si no valoró ninguno. */
  averageStars: number | null;
  /** Sus 3 mejor valorados (a igualdad, el más reciente primero). */
  favorites: GenreFootprintFavorite[];
  /** Álbumes del género en su lista Pendiente. */
  pendingCount: number;
}

export const FOOTPRINT_FAVORITES = 3;

/** Sin valoraciones ni pendientes: la sección muestra la invitación a empezar, no cifras en cero. */
export function footprintIsEmpty(footprint: GenreFootprint): boolean {
  return footprint.ratedCount === 0 && footprint.pendingCount === 0;
}
