import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import {
  activateArtistJourney,
  deleteArtistJourney,
  getArtistJourneyDetail,
} from "@/services/artist-journeys/artist-journeys";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  }
}

// Detalle del recorrido propio sobre un artista. `journey: null` cuando el
// usuario nunca activó uno — no es un estado, es la ausencia de recorrido
// (docs/00-product/product_philosophy.md §6.4.1).
export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const user = await requireUser();
    const journey = await getArtistJourneyDetail(user.id, artistId);
    return NextResponse.json({ journey });
  },
);

// Activa (o, si ya existe, devuelve) el recorrido propio sobre este artista.
// Idempotente: activar dos veces nunca duplica ni reinicia la selección.
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const journey = await activateArtistJourney(user.id, artistId);
    return NextResponse.json({ journey }, { status: 201 });
  },
);

// Borrado físico e irreversible del recorrido propio.
export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ artistId: string }> }) => {
    const { artistId } = await context.params;
    validId(artistId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    await deleteArtistJourney(user.id, artistId);
    return new NextResponse(null, { status: 204 });
  },
);
