import { NextRequest, NextResponse } from "next/server";
import { getAlbumDetail } from "@/services/catalog/album-detail";
import { withErrorHandling } from "@/lib/with-error-handling";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const result = await getAlbumDetail(id);

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Álbum no encontrado", code: "ALBUM_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (result.kind === "no_editions") {
      return NextResponse.json(
        { error: "No se encontraron ediciones para este álbum", code: "NO_EDITIONS_FOUND" },
        { status: 404 },
      );
    }

    const { detail } = result;

    return NextResponse.json({
      releaseGroup: detail.releaseGroup,
      release: detail.release,
      cover: detail.cover,
      // Contrato estable (docs/04-api/contracts.md): los datos de variante y los artistas
      // principales son del read-model de la página, no del endpoint.
      tracks: detail.tracks.map(({ recordingId, discNumber, position, title, durationSec, credits }) => ({
        recordingId,
        discNumber,
        position,
        title,
        durationSec,
        credits,
      })),
    });
  },
);
