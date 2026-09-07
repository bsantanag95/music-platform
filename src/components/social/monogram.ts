// Identidad visual derivada de un usuario: un monograma (letra + color), no un
// avatar real — el modelo no expone imágenes (ver DESIGN.md, "The Vinyl
// Listening Room"). El color se elige de forma determinista por username para
// que sea estable entre renders sin almacenar nada.
//
// Se comparte entre UserCard (búsqueda social), Placa (cabecera del perfil),
// PinnedShowcase y ProfileAffinity.

export const MONOGRAM_STYLES = [
  "border-amber/40 bg-amber/10 text-amber",
  "border-petrol/40 bg-petrol/15 text-paper",
] as const;

// Primera letra visible del nombre, en mayúscula. Usa `Array.from` para no
// partir un grapheme multibyte por la mitad.
export function monogramLetter(name: string): string {
  const [first] = Array.from(name.trim());
  return first ? first.toUpperCase() : "?";
}

// Clase de color determinista por username.
export function monogramStyle(username: string): string {
  const index = Math.abs(username.charCodeAt(0) || 0) % MONOGRAM_STYLES.length;
  return MONOGRAM_STYLES[index] ?? MONOGRAM_STYLES[0];
}
