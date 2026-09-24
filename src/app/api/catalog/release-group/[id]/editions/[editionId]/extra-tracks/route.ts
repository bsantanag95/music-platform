import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { getEditionExtraTracks } from "@/services/catalog/album-editions";

// Pistas que una edición agrega a la lista del álbum (openspec:
// enrich-album-editions-and-credits). Público: es catálogo. La primera vez ingiere la
// tracklist de la edición (una request a MusicBrainz); una caja responde EDITION_IS_BOX.
export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string; editionId: string }> }) => {
    const { id, editionId } = await params;
    if (!isValidUuid(id) || !isValidUuid(editionId)) {
      throw new ApiError("VALIDATION_ERROR", 400, "El álbum o la edición no son válidos");
    }
    return NextResponse.json({ tracks: await getEditionExtraTracks(id, editionId) });
  },
);
