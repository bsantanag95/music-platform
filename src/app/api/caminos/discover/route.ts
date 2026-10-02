import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { discoverCaminos } from "@/services/camino/discovery";

// Descubrimiento público de Caminos populares — accesible sin sesión (misma
// política que GET /api/lists/discover).
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  // `family`: clave de familia de géneros; `genre`: slug de la taxonomía (con subgéneros).
  const family = searchParams.get("family")?.trim() || undefined;
  const genre = searchParams.get("genre")?.trim() || undefined;
  const artistQuery = searchParams.get("artist")?.trim() || undefined;
  return NextResponse.json(await discoverCaminos({ family, genre, artistQuery }, page, pageSize));
});
