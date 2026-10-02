import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { searchGenres } from "@/services/genres/search";

// Búsqueda pública de géneros por nombre (openspec: show-genres, capability `genre-search`):
// alimenta el selector de "Géneros que me mueven". Sin sesión; un texto de más de 60 caracteres
// responde 400 VALIDATION_ERROR (lo valida el servicio).
export const GET = withErrorHandling(async (request: NextRequest) => {
  const q = new URL(request.url).searchParams.get("q");
  return NextResponse.json({ genres: await searchGenres(q) });
});
