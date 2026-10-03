import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { GenreVoteRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { castGenreVote, getAlbumGenreVotes, removeGenreVote } from "@/services/genres/votes";
import { toVotesResponse } from "@/services/genres/votes-response";

// Voto propio sobre un género de un álbum (openspec: add-genre-votes). PUT crea o cambia el voto
// (`{ value: 1 | -1 }`; votar un género que el álbum no tiene lo propone) y DELETE lo retira.
// Ambos devuelven el estado actualizado del panel. Personal: nunca en caché.
type Context = { params: Promise<{ id: string; slug: string }> };

export const PUT = withErrorHandling(async (request: NextRequest, { params }: Context) => {
  const { id, slug } = await params;
  const user = await requireUser();
  const parsed = GenreVoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El voto debe ser 1 o -1");
  await castGenreVote(user.id, id, slug, parsed.data.value);
  const votes = await getAlbumGenreVotes(id, user.id);
  return NextResponse.json(toVotesResponse(votes), { headers: { "Cache-Control": "no-store" } });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: Context) => {
  const { id, slug } = await params;
  const user = await requireUser();
  await removeGenreVote(user.id, id, slug);
  const votes = await getAlbumGenreVotes(id, user.id);
  return NextResponse.json(toVotesResponse(votes), { headers: { "Cache-Control": "no-store" } });
});
