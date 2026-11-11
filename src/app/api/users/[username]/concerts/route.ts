import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveSession } from "@/services/auth/sessions";
import { listProfileConcerts } from "@/services/concerts/concerts";

// Conciertos de un perfil visibles para el lector (openspec: add-my-concerts): misma matriz de visibilidad que la
// colección física. Sin permiso responde una lista vacía, sin revelar si hay registros.

export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const session = await resolveSession();
    return NextResponse.json(await listProfileConcerts(username, session?.user.id ?? null));
  },
);
