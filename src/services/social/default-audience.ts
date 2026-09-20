import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { AUDIENCES, type Audience } from "./types";

/** Tipos de contenido de biblioteca que nacen con una audiencia. */
export type NewContentType = "favorite" | "diary" | "list" | "collection";

/**
 * Default de cada tipo cuando el usuario no tiene preferencia. No son
 * uniformes a propósito (favoritos `public`, listas y colección `followers`,
 * diario `private`): por eso la preferencia es opcional y `NULL` significa
 * "según el tipo" — un default global degradaría silenciosamente favoritos o
 * el diario. Spec default-audience, "Audiencia por defecto opcional del
 * contenido nuevo".
 */
export const TYPE_DEFAULT_AUDIENCE: Readonly<Record<NewContentType, Audience>> = {
  favorite: "public",
  diary: "private",
  list: "followers",
  collection: "followers",
};

function isAudience(value: unknown): value is Audience {
  return typeof value === "string" && (AUDIENCES as readonly string[]).includes(value);
}

/**
 * Audiencia con la que nace un contenido nuevo (spec default-audience,
 * "Precedencia al crear contenido"): el valor explícito de la petición, luego
 * la audiencia por defecto del usuario y, si no la tiene, el default del tipo.
 * Se resuelve en el servidor. Solo se consulta al usuario cuando la petición no
 * trae audiencia, y nunca reescribe contenido ya creado.
 */
export async function resolveNewContentAudience(
  userId: string,
  type: NewContentType,
  explicit?: Audience | null,
): Promise<Audience> {
  if (explicit) return explicit;

  const [row] = await db
    .select({ defaultAudience: appUser.defaultAudience })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);

  return isAudience(row?.defaultAudience) ? row.defaultAudience : TYPE_DEFAULT_AUDIENCE[type];
}
