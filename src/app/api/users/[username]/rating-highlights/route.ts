import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileRatingHighlights } from "@/services/rating-highlights/rating-highlights";

// Sección "Valoraciones destacadas" del perfil (spec `rating-highlights`).
// Lista vacía cuando el solicitante no tiene acceso al perfil — nunca un
// error para ese caso, mismo criterio que "En rotación"/afinidad. `404
// USER_NOT_FOUND` (propagado por `getProfileByUsername`) si el usuario no existe.
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const session = await resolveSession();
    const highlights = await getProfileRatingHighlights(username, session?.user.id ?? null);
    return NextResponse.json({ highlights });
  },
);
