import { NextRequest, NextResponse } from "next/server";
import { findOrIngestArtist } from "@/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Falta el parámetro q" }, { status: 400 });
  }

  const artist = await findOrIngestArtist(q);
  if (!artist) {
    return NextResponse.json({ error: "No se encontró ningún artista" }, { status: 404 });
  }

  const releaseGroups = artist.mbid
    ? await findOrIngestDiscography(artist.mbid)
    : [];

  return NextResponse.json({ artist, releaseGroups });
}
