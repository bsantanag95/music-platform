import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { listJourneyArtistIds } from "@/services/artist-journeys/artist-journeys";

/** Tope de artistas por consulta: una página de Quiero escuchar trae 20. */
const MAX_JOURNEY_STATUS_IDS = 100;

const ArtistIdsSchema = z.array(z.uuid()).min(1).max(MAX_JOURNEY_STATUS_IDS);

// Qué artistas tienen recorrido propio, por lote. Reemplaza una petición por tarjeta en Quiero
// escuchar: solo consulta `user_list`, nunca la discografía ni MusicBrainz. Personal: sin caché.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get("artistIds") ?? "";
  const parsed = ArtistIdsSchema.safeParse(raw === "" ? [] : [...new Set(raw.split(","))]);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los artistas no son válidos");
  }
  const user = await requireUser();
  const journeyArtistIds = await listJourneyArtistIds(user.id, parsed.data);
  return NextResponse.json({ journeyArtistIds }, { headers: { "Cache-Control": "no-store" } });
});
