// Sitio de la fuente de una ceremonia para mostrarlo como texto del enlace (openspec: add-four-music-awards, design D9b):
// el host de la URL sin "www.", así el mensaje no lleva nombres propios. `null` si no hay URL o no es válida.

export function sourceSite(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol, host } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
