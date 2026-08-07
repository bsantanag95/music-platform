import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { findOrResolveCover } from "@/services/catalog/cover";
import { withErrorHandling } from "@/lib/with-error-handling";

// Endpoint cover-only: resuelve la carátula de un release-group con un HEAD a
// Cover Art Archive (0 llamadas a MusicBrainz) sin ingestar el tracklist de la
// edición. Lo consume LazyCoverImage en la grilla del perfil de artista.
export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const [rg] = await db
      .select()
      .from(releaseGroup)
      .where(eq(releaseGroup.id, id))
      .limit(1);

    if (!rg) {
      return NextResponse.json(
        { error: "Álbum no encontrado", code: "ALBUM_NOT_FOUND" },
        { status: 404 },
      );
    }

    const cover = await findOrResolveCover(rg);

    return NextResponse.json({ cover });
  },
);
