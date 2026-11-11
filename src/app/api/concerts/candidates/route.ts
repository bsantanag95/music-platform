import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ConcertCandidatesQuerySchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { listConcertCandidates } from "@/services/concerts/community";

// Candidatos antes de crear un concierto (openspec: add-shared-concerts-phase2): conciertos del artista a ±1 día,
// primero los de la misma ciudad. Con sesión, porque incluye los por confirmar.

export const GET = withErrorHandling(async (request: NextRequest) => {
  const parsed = ConcertCandidatesQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La búsqueda no es válida");
  const user = await requireUser();
  const [row] = await db
    .select({ id: artist.id, mbid: artist.mbid })
    .from(artist)
    .where(eq(artist.id, parsed.data.artistId))
    .limit(1);
  if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista indicado no existe");
  const candidates = await listConcertCandidates(user.id, row, parsed.data.date, parsed.data.city ?? null);
  return NextResponse.json({ candidates });
});
