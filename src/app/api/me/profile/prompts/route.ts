import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReplacePromptsRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { replacePrompts } from "@/services/profiles/music-identity";

// PUT reemplaza el conjunto completo de preguntas del perfil (0..3), en el orden
// del array (spec profile-music-identity, "Preguntas del perfil").
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ReplacePromptsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Las preguntas del perfil no son válidas");
  }
  return NextResponse.json({ prompts: await replacePrompts(user.id, parsed.data.prompts) });
});

// DELETE quita todas las preguntas (equivale a PUT con lista vacía).
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json({ prompts: await replacePrompts(user.id, []) });
});
