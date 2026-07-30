import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, track, recording, credit, artist } from "@/db/schema";
import { findOrIngestTracklist } from "@/services/catalog/ingest-release";
import { coverThumbUrl } from "@/services/cover-art";
import { withErrorHandling } from "@/lib/with-error-handling";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const [rg] = await db.select().from(releaseGroup).where(eq(releaseGroup.id, id)).limit(1);
    if (!rg || !rg.mbid) {
      return NextResponse.json(
        { error: "Álbum no encontrado", code: "ALBUM_NOT_FOUND" },
        { status: 404 },
      );
    }

    const releaseRow = await findOrIngestTracklist(rg.id, rg.mbid);
    if (!releaseRow) {
      return NextResponse.json(
        { error: "No se encontraron ediciones para este álbum", code: "NO_EDITIONS_FOUND" },
        { status: 404 },
      );
    }

    const tracks = await db
      .select({
        recordingId: track.recordingId,
        position: track.position,
        discNumber: track.discNumber,
        title: recording.title,
        durationSec: recording.durationSec,
      })
      .from(track)
      .innerJoin(recording, eq(track.recordingId, recording.id))
      .where(eq(track.releaseId, releaseRow.id));

    const recordingIds = tracks.map((t) => t.recordingId);

    const creditRows = recordingIds.length
      ? await db
          .select({
            recordingId: credit.recordingId,
            artistId: artist.id,
            name: artist.name,
            role: credit.role,
            joinPhrase: credit.joinPhrase,
            position: credit.position,
          })
          .from(credit)
          .innerJoin(artist, eq(artist.id, credit.artistId))
          .where(inArray(credit.recordingId, recordingIds))
      : [];

    const creditsByRecording = new Map<string, typeof creditRows>();
    for (const c of creditRows) {
      if (!c.recordingId) continue;
      const existing = creditsByRecording.get(c.recordingId) ?? [];
      existing.push(c);
      creditsByRecording.set(c.recordingId, existing);
    }

    const tracksWithCredits = tracks.map((t) => ({
      ...t,
      credits: (creditsByRecording.get(t.recordingId) ?? [])
        .sort((a, b) => a.position - b.position)
        .map(({ artistId, name, role, joinPhrase }) => ({ artistId, name, role, joinPhrase })),
    }));

    return NextResponse.json({
      release: releaseRow,
      cover: releaseRow.mbid ? coverThumbUrl(releaseRow.mbid) : null,
      tracks: tracksWithCredits,
    });
  },
);
