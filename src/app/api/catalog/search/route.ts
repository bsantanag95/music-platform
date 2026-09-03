import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/services/catalog/search-catalog";
import { withErrorHandling } from "@/lib/with-error-handling";

// Búsqueda de candidatos (artistas + álbumes) sin ingerir discografía.
// Sin coincidencias es `200 { results: [] }`, no 404; el fallo total de
// MusicBrainz sin datos locales se propaga como ApiError(INTERNAL_ERROR,
// 502) y lo resuelve `withErrorHandling`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "Falta el parámetro q", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const results = await searchCatalog(q);
  return NextResponse.json({ results });
});
