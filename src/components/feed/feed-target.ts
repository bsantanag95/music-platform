// Ruta de catálogo del objetivo de una entrada de feed. Compartido por el feed
// (`FeedActivityList`) y los bloques de Inicio que listan actividad
// (`CommunityActivity`, `PopularCommentsTabs`). Módulo puro y sin dependencias:
// lo importan tanto Server como Client Components.
export function targetHref(
  type: "artist" | "release-group" | "recording",
  id: string,
): string {
  if (type === "artist") return `/artist/${id}`;
  if (type === "release-group") return `/album/${id}`;
  return `/song/${id}`;
}
