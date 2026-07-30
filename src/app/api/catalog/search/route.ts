import { NextRequest, NextResponse } from "next/server";
import { findOrIngestArtist } from "@/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";
import { withErrorHandling } from "@/lib/with-error-handling";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json(
      { error: "Falta el parámetro q", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const artist = await findOrIngestArtist(q);
  if (!artist) {
    return NextResponse.json(
      { error: "No se encontró ningún artista", code: "ARTIST_NOT_FOUND" },
      { status: 404 },
    );
  }

  const releaseGroups = await findOrIngestDiscography(artist);

  return NextResponse.json({ artist, releaseGroups });
});
