import { albumHref, artistHref, songHref } from "@/lib/catalog-links";

// Ruta de catálogo del objetivo de una entrada de feed. Compartido por el feed
// (`FeedActivityList`) y los bloques de Inicio que listan actividad
// (`CommunityActivity`, `PopularCommentsTabs`). Módulo puro y sin dependencias:
// lo importan tanto Server como Client Components. `title`/`artistName` son
// opcionales: alimentan el slug decorativo y, sin ellos, la ruta sigue siendo
// válida (solo el id).
export function targetHref(
  type: "artist" | "release-group" | "recording",
  id: string,
  title = "",
  artistName: string | null = null,
): string {
  if (type === "artist") return artistHref(title, id);
  if (type === "release-group") return albumHref(artistName, title, id);
  return songHref(artistName, title, id);
}
