import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requireUser } from "@/services/auth/authorization";
import { followArtist, unfollowArtist } from "@/services/social/artist-following";

// PUT sigue / DELETE deja de seguir a un artista (openspec: add-artist-following).
// Ambos idempotentes; mismo patrón que PUT /api/users/[username]/follow.
export const PUT = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidUuid(id)) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
    const user = await requireUser();
    return NextResponse.json(await followArtist(user.id, id));
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    if (!isValidUuid(id)) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
    const user = await requireUser();
    return NextResponse.json(await unfollowArtist(user.id, id));
  },
);
