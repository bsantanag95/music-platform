import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { getCurrentUser } from "@/services/auth/authorization";
import { getAlbumGenreVotes } from "@/services/genres/votes";
import { toVotesResponse } from "@/services/genres/votes-response";

// Géneros de un álbum con su puntaje y rango (openspec: add-genre-votes, capability
// `genre-vote-panel`). Público: con sesión suma el voto propio y si puede votar. Las cifras de
// votos solo salen con suficientes votantes. Depende de la sesión, así que nunca va en caché.
export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isValidUuid(id)) throw new ApiError("VALIDATION_ERROR", 400, "El álbum no es válido");
  const viewer = await getCurrentUser();
  const votes = await getAlbumGenreVotes(id, viewer?.id ?? null);
  return NextResponse.json(toVotesResponse(votes), { headers: { "Cache-Control": "no-store" } });
});
