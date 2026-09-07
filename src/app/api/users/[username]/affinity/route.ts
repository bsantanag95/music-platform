import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileAffinity } from "@/services/profiles/affinity";

// Coincidencias entre el visitante autenticado y el dueño del perfil. Devuelve
// `{ affinity: null }` cuando no aplica (sin sesión, el propio dueño, sin
// acceso, o bloqueo).
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const session = await resolveSession();
    const affinity = await getProfileAffinity(username, session?.user.id ?? null);
    return NextResponse.json({ affinity });
  },
);
