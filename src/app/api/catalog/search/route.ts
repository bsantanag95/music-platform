import { NextRequest, NextResponse } from "next/server";
import { searchCatalogByType } from "@/services/catalog/search";
import { parseCatalogSearchParams } from "@/services/catalog/search/params";
import { withErrorHandling } from "@/lib/with-error-handling";

// Búsqueda del catálogo por tipo (openspec: redesign-scoped-search): un tipo
// por solicitud (`type=artist|album|song`), sin ingerir discografía. Sin
// coincidencias es `200` con `results: []`; `q` o `type` inválidos → 400
// VALIDATION_ERROR; MusicBrainz caído sin datos locales → ApiError
// (INTERNAL_ERROR, 502), resuelto por `withErrorHandling`.
//
// Cancelación (openspec: speed-up-quick-actions-search): `req.signal` se aborta cuando
// quien pidió la búsqueda la abandona; la búsqueda deja de encolar requests a MusicBrainz
// y no escribe. Nadie lee la respuesta, así que no se registra como error.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const params = parseCatalogSearchParams(req.nextUrl.searchParams);
  try {
    return NextResponse.json(await searchCatalogByType(params, req.signal));
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 });
    throw err;
  }
});
