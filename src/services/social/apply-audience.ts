import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  collectionEntry,
  favorite,
  listenEntry,
  listenEntryHighlight,
  userAlbumPin,
  userList,
  userListPin,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { AUDIENCES, type Audience } from "./types";

/** Elementos que cambiarían (vista previa) o cambiaron (aplicación) por tipo. */
export interface AudienceChangeCounts {
  favorites: number;
  diary: number;
  lists: number;
  collection: number;
}

/**
 * De los elementos que cambiarían, cuántos están fijados o destacados en el
 * perfil. Las entradas de diario destacadas siguen visibles con cualquier
 * audiencia (spec diary-visibility); las listas y los álbumes favoritos
 * fijados dejan de verse para los demás si pasan a una audiencia más cerrada.
 */
export interface HighlightedCounts {
  pinnedLists: number;
  pinnedAlbumFavorites: number;
  highlightedDiary: number;
}

export interface ApplyAudiencePreview extends AudienceChangeCounts {
  audience: Audience;
  highlighted: HighlightedCounts;
}

export interface ApplyAudienceResult extends AudienceChangeCounts {
  audience: Audience;
}

function assertAudience(audience: unknown): asserts audience is Audience {
  if (typeof audience !== "string" || !(AUDIENCES as readonly string[]).includes(audience)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida");
  }
}

// Solo las listas estándar del propio usuario: las editoriales no son suyas.
function ownStandardLists(userId: string) {
  return and(eq(userList.ownerId, userId), eq(userList.kind, "standard"));
}

/**
 * Vista previa de "Aplicar a lo existente" (spec default-audience, "Vista previa
 * de la acción de aplicar"): cuántos elementos del usuario tienen hoy una
 * audiencia distinta de la indicada y, de ellos, cuántos están fijados o
 * destacados. Solo lee; no modifica nada.
 */
export async function previewApplyAudience(
  userId: string,
  audience: Audience,
): Promise<ApplyAudiencePreview> {
  assertAudience(audience);

  const [[fav], [diary], [lists], [collection], [pinnedLists], [pinnedAlbums], [highlightedDiary]] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(favorite)
        .where(and(eq(favorite.userId, userId), ne(favorite.audience, audience))),
      db
        .select({ n: count() })
        .from(listenEntry)
        .where(and(eq(listenEntry.userId, userId), ne(listenEntry.audience, audience))),
      db
        .select({ n: count() })
        .from(userList)
        .where(and(ownStandardLists(userId), ne(userList.audience, audience))),
      db
        .select({ n: count() })
        .from(collectionEntry)
        .where(and(eq(collectionEntry.userId, userId), ne(collectionEntry.audience, audience))),
      db
        .select({ n: count() })
        .from(userListPin)
        .innerJoin(userList, eq(userList.id, userListPin.listId))
        .where(
          and(eq(userListPin.ownerId, userId), ownStandardLists(userId), ne(userList.audience, audience)),
        ),
      db
        .select({ n: count() })
        .from(userAlbumPin)
        .innerJoin(favorite, eq(favorite.id, userAlbumPin.favoriteId))
        .where(and(eq(userAlbumPin.userId, userId), ne(favorite.audience, audience))),
      db
        .select({ n: count() })
        .from(listenEntryHighlight)
        .innerJoin(listenEntry, eq(listenEntry.id, listenEntryHighlight.listenEntryId))
        .where(and(eq(listenEntryHighlight.userId, userId), ne(listenEntry.audience, audience))),
    ]);

  return {
    audience,
    favorites: fav?.n ?? 0,
    diary: diary?.n ?? 0,
    lists: lists?.n ?? 0,
    collection: collection?.n ?? 0,
    highlighted: {
      pinnedLists: pinnedLists?.n ?? 0,
      pinnedAlbumFavorites: pinnedAlbums?.n ?? 0,
      highlightedDiary: highlightedDiary?.n ?? 0,
    },
  };
}

/**
 * Aplica una audiencia a todo el contenido de biblioteca existente del usuario
 * (spec default-audience, "Aplicar la audiencia a todo lo existente"):
 * favoritos, entradas de diario, listas estándar propias y copias de colección.
 *
 * - Una sola transacción: o cambian todos los tipos o ninguno.
 * - Idempotente: solo actualiza las filas cuya audiencia difiere.
 * - Solo escribe la columna `audience`; no toca pines, destacados ni la
 *   preferencia guardada. El indicador `app.preserve_updated_at` (migración
 *   0037) hace que los triggers de `user_list` y `collection_entry` conserven
 *   `updated_at`, para no generar eventos de "lista actualizada" en el feed.
 */
export async function applyAudienceToExisting(
  userId: string,
  audience: Audience,
): Promise<ApplyAudienceResult> {
  assertAudience(audience);

  return db.transaction(async (tx) => {
    // `true` = local a la transacción: no sobrevive al commit ni se filtra a otras.
    await tx.execute(sql`SELECT set_config('app.preserve_updated_at', 'on', true)`);

    const favorites = await tx
      .update(favorite)
      .set({ audience })
      .where(and(eq(favorite.userId, userId), ne(favorite.audience, audience)))
      .returning({ id: favorite.id });
    const diary = await tx
      .update(listenEntry)
      .set({ audience })
      .where(and(eq(listenEntry.userId, userId), ne(listenEntry.audience, audience)))
      .returning({ id: listenEntry.id });
    const lists = await tx
      .update(userList)
      .set({ audience })
      .where(and(ownStandardLists(userId), ne(userList.audience, audience)))
      .returning({ id: userList.id });
    const collection = await tx
      .update(collectionEntry)
      .set({ audience })
      .where(and(eq(collectionEntry.userId, userId), ne(collectionEntry.audience, audience)))
      .returning({ id: collectionEntry.id });

    return {
      audience,
      favorites: favorites.length,
      diary: diary.length,
      lists: lists.length,
      collection: collection.length,
    };
  });
}
