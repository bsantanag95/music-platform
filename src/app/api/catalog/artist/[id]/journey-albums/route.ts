import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { artistExists, listArtistJourneyAlbums } from "@/services/catalog/artist-journey-albums";

// Discos propios del artista para el modal "Completar discografía" (openspec:
// refine-artist-page-phase1, design D2). Datos de catálogo públicos: no exige sesión, y nunca
// sale a MusicBrainz (lee la discografía guardada).
export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success || !(await artistExists(id))) {
      throw new ApiError("ARTIST_NOT_FOUND", 404, "Artista no encontrado");
    }
    return NextResponse.json({ albums: await listArtistJourneyAlbums(id) });
  },
);
