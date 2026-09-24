import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { image } from "@/db/schema";
import { imageService } from "./image-service";

/**
 * Resuelve las URLs públicas de un lote de imágenes a partir de sus ids
 * (`app_user.avatar_image_id`), con una sola consulta. Devuelve un mapa
 * `imageId → url`; los ids sin fila no aparecen.
 *
 * `resolveUrl()` recibe la `storage_key`, no el id de la imagen: pasarle el id
 * produce una URL rota. Además, una configuración de storage ausente NO debe
 * tumbar la página que muestra el avatar: se registra y el avatar cae al
 * monograma (`null`).
 */
export async function resolveImageUrls(
  imageIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, string>> {
  const ids = [...new Set(imageIds.filter((id): id is string => Boolean(id)))];
  const urls = new Map<string, string>();
  if (ids.length === 0) return urls;

  const rows = await db
    .select({ id: image.id, storageKey: image.storageKey })
    .from(image)
    .where(inArray(image.id, ids));

  try {
    for (const row of rows) urls.set(row.id, imageService.resolveUrl(row.storageKey));
  } catch (err) {
    console.error("No se pudieron resolver las URLs de avatar:", err);
    urls.clear();
  }
  return urls;
}

/** Variante para un solo id. */
export async function resolveImageUrl(imageId: string | null | undefined): Promise<string | null> {
  if (!imageId) return null;
  return (await resolveImageUrls([imageId])).get(imageId) ?? null;
}
