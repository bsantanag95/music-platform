import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import {
  archiveArtistJourney,
  unarchiveArtistJourney,
} from "@/services/artist-journeys/artist-journeys";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  }
}

// Archivar: el usuario deja de perseguir activamente el recorrido sin perder
// su selección ni el progreso ya registrado. Reversible con DELETE. Ambas
// devuelven el detalle actualizado (el estado depende del progreso guardado,
// que el cliente no tiene forma de re-derivar sin repetirlo).
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const journey = await archiveArtistJourney(user.id, artistId);
    return NextResponse.json({ journey });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const journey = await unarchiveArtistJourney(user.id, artistId);
    return NextResponse.json({ journey });
  },
);
