import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/with-error-handling";
import { SEARCH_TYPES } from "@/services/catalog/search/params";
import { suggest } from "@/services/catalog/search/suggest";
import type { SearchType } from "@/services/catalog/search/types";

// Sugerencias del buscador mientras se escribe (openspec: redesign-scoped-search,
// capacidad search-typeahead). Solo lecturas locales — nunca MusicBrainz — y
// fuera de /api/catalog porque también sugiere usuarios. Una consulta de
// menos de 2 caracteres responde `{ suggestions: [] }`.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const type = params.get("type");
  if (!type || !(SEARCH_TYPES as readonly string[]).includes(type)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El parámetro type debe ser artist, album, song o user");
  }
  const suggestions = await suggest(type as SearchType, params.get("q") ?? "");
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
});
