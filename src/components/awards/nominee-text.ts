// Texto de un nominado sin ficha en el catálogo (openspec: polish-hall-of-fame-page). La curaduría lo escribe como lo nombra la
// ceremonia, "Título — Artista"; sin separarlo se mostraba como un título largo y sin artista, distinto del resto de las tarjetas.

/** Separador de la curaduría entre título y artista. */
const SEPARATOR = " — ";

/**
 * Título y artista de un nominado solo texto: el crédito curado si lo tiene; si no, el texto partido en el primer " — ". Sin
 * separador (un nombre de persona, un título suelto), el texto entero es el título.
 */
export function splitNomineeText(text: string, credit: string | null): { title: string; artist: string | null } {
  if (credit) return { title: text, artist: credit };
  const at = text.indexOf(SEPARATOR);
  if (at <= 0) return { title: text, artist: null };
  const title = text.slice(0, at).trim();
  const artist = text.slice(at + SEPARATOR.length).trim();
  return title && artist ? { title, artist } : { title: text, artist: null };
}
