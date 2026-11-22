import { formatStars } from "@/components/album/album-format";

/**
 * Nota en la forma compacta que `rating-display` fija para la actividad de la comunidad: `86/100` si la
 * valoración tiene puntaje detallado, el número de estrellas si no — nunca ambos. Vive fuera de
 * `ActivityCard` (cliente) para que también la usen componentes de servidor como el estante de Inicio.
 */
export function compactRatingValue(stars: string, detailedScore: number | null, locale: string): string {
  return detailedScore != null ? `${detailedScore}/100` : formatStars(Number(stars), locale);
}
