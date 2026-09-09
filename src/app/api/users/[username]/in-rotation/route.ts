import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileInRotation } from "@/services/profiles/in-rotation";

// Sección "En rotación" del perfil, para hidratación diferida y el
// previsualizador "cómo te ven". Devuelve `{ inRotation: null }` cuando el
// solicitante no tiene acceso al perfil o no hay actividad que alcance el
// umbral — nunca un error para esos casos. `404 USER_NOT_FOUND` (propagado por
// `getProfileByUsername`) si el usuario no existe.
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const session = await resolveSession();
    const inRotation = await getProfileInRotation(username, session?.user.id ?? null);
    return NextResponse.json({ inRotation });
  },
);
