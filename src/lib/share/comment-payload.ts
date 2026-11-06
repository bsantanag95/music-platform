import { absoluteUrl } from "./app-url";

// Datos de la hoja para un comentario, armados en el cliente: `Comments` carga muchas filas y un objetivo por fila
// sería una consulta por comentario. La URL de imagen va sin versión: la ruta genera con los datos actuales y
// caché corta. La vista previa de un crawler sí va versionada, porque sale de los metadatos de `/comment/<id>`.

export function commentSharePayload(input: { commentId: string; locale: string; title: string; username: string }) {
  const { commentId, locale, title, username } = input;
  const params = new URLSearchParams({ locale, format: "link" });
  return {
    kind: "comment" as const,
    ref: commentId,
    url: absoluteUrl(`/${locale}/comment/${commentId}`),
    title,
    imageUrl: `/api/share/image/comment/${commentId}?${params.toString()}`,
    imageAlt: title,
    downloadName: `comment-${username}`,
  };
}
