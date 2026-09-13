import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SetArtistJourneySelectionRequestSchema } from "@/lib/api/schemas";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { setJourneySelection } from "@/services/artist-journeys/artist-journeys";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  }
}

// Reemplaza de una sola vez toda la selección del recorrido propio. El
// modal de gestión edita un borrador local y llama a este endpoint solo al
// guardar — evita una petición por álbum marcado/desmarcado.
export const PUT = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = SetArtistJourneySelectionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La selección no es válida");
    }
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const journey = await setJourneySelection(user.id, artistId, parsed.data.releaseGroupIds);
    return NextResponse.json({ journey });
  },
);
