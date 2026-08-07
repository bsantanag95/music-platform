// Cover Art Archive — ver docs/03-data/data-licensing.md.
// Las carátulas son copyright de las disqueras, no CC0. Decisión de
// producto: usar siempre la miniatura de 250px (front-250), nunca la
// imagen a resolución completa, siguiendo la misma práctica que Wikipedia
// para portadas de álbum (fines de identificación, no decorativos).

// La carátula se resuelve a nivel de release-group, no de release: Cover Art
// Archive guarda el arte por release y `/release/{mbid}/front-250` solo responde
// para la edición que realmente lleva la imagen. El endpoint de release-group
// devuelve la portada del álbum completo sin importar qué edición se ingirió.

export function coverThumbUrl(releaseGroupMbid: string): string {
  return `https://coverartarchive.org/release-group/${releaseGroupMbid}/front-250`;
}

/**
 * Verifica si el release-group tiene carátula en Cover Art Archive con un
 * request `HEAD`. Devuelve la URL de la miniatura si existe (status `[200,400)`,
 * donde los 3xx redirigen al arte en archive.org) y `null` ante 404, errores de
 * servidor o fallos de red — la ingesta nunca debe romperse por la carátula.
 */
export async function resolveCoverThumbUrl(releaseGroupMbid: string): Promise<string | null> {
  if (!releaseGroupMbid) return null;
  const url = coverThumbUrl(releaseGroupMbid);
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual" });
    return response.status >= 200 && response.status < 400 ? url : null;
  } catch {
    return null;
  }
}
