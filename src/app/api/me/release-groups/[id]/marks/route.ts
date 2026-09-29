import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requireUser } from "@/services/auth/authorization";
import { getReleaseGroupMarks } from "@/services/catalog/release-group-marks";

// Marcas del usuario sobre un disco (openspec: extend-album-quick-actions): escuchado, nota y
// puntaje detallado, favorito, Pendiente y listas propias. Las pide el menú de acciones del disco
// al abrirse fuera de la discografía del artista. Personal: nunca en caché.
export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  if (!isValidUuid(id)) throw new ApiError("VALIDATION_ERROR", 400, "El álbum no es válido");
  const user = await requireUser();
  return NextResponse.json(await getReleaseGroupMarks(user.id, id), { headers: { "Cache-Control": "no-store" } });
});
