import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userProfilePrompt } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  ReplacePromptsRequestSchema,
  UpdateMusicIdentityRequestSchema,
  type ProfilePromptInput,
  type UpdateMusicIdentityRequest,
} from "@/lib/api/schemas";
import type { Genre, ListeningFormat, ProfilePromptData, PromptKey, SelfRole } from "@/lib/music-identity";

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
