// Qué categorías de la ceremonia son "destacadas" (openspec: redesign-awards-pages). Es una regla de presentación, no de
// datos: las primeras `FEATURED_CATEGORIES` del campo general en el orden curado (en los Grammy, Álbum, Grabación y Canción
// del año y Mejor artista nuevo) van con el ganador grande y todos los nominados a la vista; el resto, como filas compactas.

export const FEATURED_CATEGORIES = 4;

export function splitFeatured<T>(general: T[]): { featured: T[]; rest: T[] } {
  return { featured: general.slice(0, FEATURED_CATEGORIES), rest: general.slice(FEATURED_CATEGORIES) };
}
