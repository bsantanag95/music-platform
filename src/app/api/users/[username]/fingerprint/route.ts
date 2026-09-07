import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveSession } from "@/services/auth/sessions";
import { getTasteFingerprint } from "@/services/profiles/stats";

// Huella de gusto del perfil, para hidratación diferida y para el
// previsualizador "cómo te ven". Devuelve `{ fingerprint: null }` cuando el
// visitante no tiene acceso al contenido del perfil.
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const session = await resolveSession();
    const fingerprint = await getTasteFingerprint(username, session?.user.id ?? null);
    return NextResponse.json({ fingerprint });
  },
);
