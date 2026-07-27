import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, track, recording } from "@/db/schema";
import { findOrIngestTracklist } from "@/services/catalog/ingest-release";
import { coverThumbUrl } from "@/services/cover-art";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const [rg] = await db.select().from(releaseGroup).where(eq(releaseGroup.id, params.id)).limit(1);
  if (!rg || !rg.mbid) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const releaseRow = await findOrIngestTracklist(rg.id, rg.mbid);
  if (!releaseRow) {
    return NextResponse.json({ error: "No se encontraron ediciones para este álbum" }, { status: 404 });
  }

  const tracks = await db
    .select({
      position: track.position,
      discNumber: track.discNumber,
      title: recording.title,
      durationSec: recording.durationSec,
    })
    .from(track)
    .innerJoin(recording, eq(track.recordingId, recording.id))
    .where(eq(track.releaseId, releaseRow.id));

  return NextResponse.json({
    release: releaseRow,
    cover: releaseRow.mbid ? coverThumbUrl(releaseRow.mbid) : null,
    tracks,
  });
}
