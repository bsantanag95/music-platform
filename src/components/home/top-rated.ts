import { formatStars } from "@/components/album/album-format";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

/**
 * Datos de presentación del riel «Mejor valorados» de Inicio: el ★ promedio por álbum (lo que ordena el
 * ranking) y los rótulos de categoría. Lo comparten la portada sin sesión y el Inicio de una cuenta sin
 * actividad (openspec: redesign-signed-in-home-phase3), para que ambos rieles se lean igual.
 */
export function topRatedStats(albums: readonly { id: string; avgStars: number }[], locale: string): Record<string, string> {
  return Object.fromEntries(albums.map((album) => [album.id, `★ ${formatStars(album.avgStars, locale)}`]));
}

export function albumCategoryLabels(t: (key: string) => string): Record<ReleaseGroupCategory, string> {
  return {
    studio: t("categories.studio"),
    single_ep: t("categories.single_ep"),
    compilation: t("categories.compilation"),
    live_other: t("categories.live_other"),
  };
}
