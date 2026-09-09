import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReplaceAlbumFavoritesRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { replaceAlbumFavorites } from "@/services/profiles/album-favorites";

// PUT reemplaza el conjunto ordenado de álbumes favoritos del perfil (0..6).
// Cada id SHALL ser un favorito de álbum propio; el orden del array define la
// posición (openspec: redesign-profile-album-identity).
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ReplaceAlbumFavoritesRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los álbumes favoritos del perfil no son válidos");
  }
  const albumFavorites = await replaceAlbumFavorites(user.id, parsed.data.favoriteIds);
  return NextResponse.json({ albumFavorites });
});

// DELETE vacía la sección.
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  const albumFavorites = await replaceAlbumFavorites(user.id, []);
  return NextResponse.json({ albumFavorites });
});
