// Cover Art Archive — ver docs/03-data/data-licensing.md.
// Las carátulas son copyright de las disqueras, no CC0. Decisión de
// producto: usar siempre la miniatura de 250px (front-250), nunca la
// imagen a resolución completa, siguiendo la misma práctica que Wikipedia
// para portadas de álbum (fines de identificación, no decorativos).

// La carátula se resuelve a nivel de release-group, no de release: Cover Art
// Archive guarda el arte por release y `/release/{mbid}/front-250` solo responde
// para la edición que realmente lleva la imagen. El endpoint de release-group
// devuelve la portada del álbum completo sin importar qué edición se ingirió.

import { COVER_MIRROR } from "@/lib/config/cover-mirror";

export function coverThumbUrl(releaseGroupMbid: string): string {
  return `https://coverartarchive.org/release-group/${releaseGroupMbid}/front-250`;
}

/** Resultado de un `GET` a la miniatura de CAA (openspec: mirror-cover-art). */
export type CoverThumbFetchResult =
  | { status: "found"; bytes: Buffer }
  | { status: "missing" }
  | { status: "transient" };

/**
 * Descarga la miniatura `front-250` de CAA siguiendo sus redirecciones (307 a
 * archive.org, 302 a un nodo `dnXXXX.ca.archive.org`). Devuelve los bytes para
 * espejar. Distingue la ausencia confirmada (`404` → `missing`) de los errores
 * que ameritan reintento (`5xx`, timeout, red → `transient`). El timeout lo
 * impone `AbortController`: la cadena puede tardar 2,5–3 s en frío.
 *
 * Solo para la ruta cover-only, el backfill y la revalidación; el render SSR
 * del detalle usa `resolveCoverThumbUrl` (un `HEAD` barato).
 */
export async function fetchCoverThumb(
  releaseGroupMbid: string,
): Promise<CoverThumbFetchResult> {
  if (!releaseGroupMbid) return { status: "missing" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_MIRROR.fetchTimeoutMs);

  try {
    const response = await fetch(coverThumbUrl(releaseGroupMbid), {
      redirect: "follow",
      signal: controller.signal,
    });

    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "transient" };

    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length > 0 ? { status: "found", bytes } : { status: "transient" };
  } catch {
    return { status: "transient" };
  } finally {
    clearTimeout(timer);
  }
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
