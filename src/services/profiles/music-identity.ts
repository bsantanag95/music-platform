import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, genre, userProfilePrompt } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  ReplacePromptsRequestSchema,
  UpdateMusicIdentityRequestSchema,
  type ProfilePromptInput,
  type UpdateMusicIdentityRequest,
} from "@/lib/api/schemas";
import { MUSIC_IDENTITY_LIMITS, type Genre, type ListeningFormat, type ProfilePromptData, type PromptKey, type SelfRole } from "@/lib/music-identity";
import { GENRE_SLUG_PATTERN } from "@/services/genres/slug";

// Identidad musical del perfil (spec profile-music-identity): "Me defino como",
// géneros, formatos de escucha y preguntas. Los valores permitidos viven en
// `src/lib/music-identity.ts`; acá solo se validan (con los esquemas de la API,
// una única fuente de reglas) y se persisten.

export interface StoredMusicIdentity {
  selfRoles: SelfRole[];
  genres: Genre[];
  listeningFormats: ListeningFormat[];
}

/**
 * Actualiza los campos enviados de "Me defino como", géneros y formatos: lo que
 * llega reemplaza al valor anterior (`[]` lo vacía) y lo que no llega no se
 * toca. Devuelve el estado guardado.
 */
export async function updateMusicIdentity(
  userId: string,
  input: UpdateMusicIdentityRequest,
): Promise<StoredMusicIdentity> {
  const parsed = UpdateMusicIdentityRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos de identidad musical no son válidos");
  }

  // Cada género debe existir como estilo visible de la taxonomía (openspec: show-genres, D5).
  const slugs = parsed.data.genres;
  if (slugs && slugs.length > 0) {
    const found = await db
      .select({ slug: genre.slug })
      .from(genre)
      .where(and(inArray(genre.slug, slugs), eq(genre.kind, "style")));
    if (found.length !== slugs.length) {
      throw new ApiError("VALIDATION_ERROR", 400, "Alguno de los géneros no existe");
    }
  }

  const [row] = await db
    .update(appUser)
    .set(parsed.data)
    .where(eq(appUser.id, userId))
    .returning({
      selfRoles: appUser.selfRoles,
      genres: appUser.genres,
      listeningFormats: appUser.listeningFormats,
    });
  if (!row) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");

  return {
    selfRoles: row.selfRoles as SelfRole[],
    genres: row.genres as Genre[],
    listeningFormats: row.listeningFormats as ListeningFormat[],
  };
}

/**
 * Agrega un género a "Géneros que me mueven" sin reemplazar la lista (openspec: redesign-genre-page,
 * capability `genre-page-personal`). Es una sola sentencia atómica: si la persona editó la lista
 * desde otra pestaña, esos géneros se conservan. Idempotente (si ya estaba, devuelve la lista tal
 * cual); con la lista llena (`MUSIC_IDENTITY_LIMITS.genres`) responde 409. El slug debe ser un estilo
 * visible de la taxonomía (ADR 0024).
 */
export async function addIdentityGenre(userId: string, slug: string): Promise<Genre[]> {
  if (!GENRE_SLUG_PATTERN.test(slug) || slug.length > 120) throw new ApiError("GENRE_NOT_FOUND", 404, "Género no encontrado");
  const [style] = await db
    .select({ slug: genre.slug })
    .from(genre)
    .where(and(eq(genre.slug, slug), eq(genre.kind, "style")))
    .limit(1);
  if (!style) throw new ApiError("GENRE_NOT_FOUND", 404, "Género no encontrado");

  const [updated] = await db
    .update(appUser)
    .set({ genres: sql`array_append(${appUser.genres}, ${style.slug})` })
    .where(
      and(
        eq(appUser.id, userId),
        sql`NOT (${style.slug} = ANY(${appUser.genres}))`,
        sql`cardinality(${appUser.genres}) < ${MUSIC_IDENTITY_LIMITS.genres}`,
      ),
    )
    .returning({ genres: appUser.genres });
  if (updated) return updated.genres as Genre[];

  // No actualizó nada: ya estaba (idempotente), la lista está llena o la persona no existe.
  const [current] = await db.select({ genres: appUser.genres }).from(appUser).where(eq(appUser.id, userId)).limit(1);
  if (!current) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  if (current.genres.includes(style.slug)) return current.genres as Genre[];
  throw new ApiError("MUSIC_IDENTITY_GENRES_FULL", 409, "La identidad musical ya tiene el máximo de géneros");
}

/**
 * Quita un género de "Géneros que me mueven" sin reemplazar la lista. Idempotente: quitar uno que no
 * estaba responde con la lista sin cambios. No exige que el género siga siendo un estilo visible, para
 * que se pueda retirar uno que MusicBrainz ya ocultó.
 */
export async function removeIdentityGenre(userId: string, slug: string): Promise<Genre[]> {
  if (!GENRE_SLUG_PATTERN.test(slug) || slug.length > 120) throw new ApiError("GENRE_NOT_FOUND", 404, "Género no encontrado");
  const [updated] = await db
    .update(appUser)
    .set({ genres: sql`array_remove(${appUser.genres}, ${slug})` })
    .where(eq(appUser.id, userId))
    .returning({ genres: appUser.genres });
  if (!updated) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return updated.genres as Genre[];
}

/** Las preguntas de una persona, en el orden que eligió. */
export async function listPrompts(userId: string): Promise<ProfilePromptData[]> {
  const rows = await db
    .select({
      promptKey: userProfilePrompt.promptKey,
      answer: userProfilePrompt.answer,
      position: userProfilePrompt.position,
    })
    .from(userProfilePrompt)
    .where(eq(userProfilePrompt.userId, userId))
    .orderBy(asc(userProfilePrompt.position));
  return rows.map((row) => ({ promptKey: row.promptKey as PromptKey, answer: row.answer, position: row.position }));
}

/**
 * Reemplaza el conjunto COMPLETO de preguntas (0..3), de forma atómica: o queda
 * el conjunto nuevo o queda el anterior. La posición se deriva del orden del
 * array. Rechaza una pregunta fuera de la lista, repetida, una respuesta vacía,
 * de más de una línea o de más de 100 caracteres, y una cuarta pregunta.
 */
export async function replacePrompts(userId: string, prompts: ProfilePromptInput[]): Promise<ProfilePromptData[]> {
  const parsed = ReplacePromptsRequestSchema.safeParse({ prompts });
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Las preguntas del perfil no son válidas");
  }

  const saved = await db.transaction(async (tx) => {
    await tx.delete(userProfilePrompt).where(eq(userProfilePrompt.userId, userId));
    if (parsed.data.prompts.length === 0) return [];
    return tx
      .insert(userProfilePrompt)
      .values(
        parsed.data.prompts.map((prompt, position) => ({
          userId,
          promptKey: prompt.promptKey,
          answer: prompt.answer,
          position,
        })),
      )
      .returning({
        promptKey: userProfilePrompt.promptKey,
        answer: userProfilePrompt.answer,
        position: userProfilePrompt.position,
      });
  });

  return saved
    .map((row) => ({ promptKey: row.promptKey as PromptKey, answer: row.answer, position: row.position }))
    .sort((a, b) => a.position - b.position);
}
