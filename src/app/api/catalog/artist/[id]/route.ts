import { NextRequest, NextResponse } from "next/server";
import { getArtistById } from "@/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";
import { withErrorHandling } from "@/lib/with-error-handling";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const artist = await getArtistById(id);
    if (!artist) {
      return NextResponse.json(
        { error: "Artista no encontrado", code: "ARTIST_NOT_FOUND" },
        { status: 404 },
      );
    }

    const releaseGroups = await findOrIngestDiscography(artist);

    return NextResponse.json({ artist, releaseGroups });
  },
);
