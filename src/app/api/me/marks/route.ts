import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SocialTargetTypeSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requireUser } from "@/services/auth/authorization";
import { getTargetMarks } from "@/services/catalog/target-marks";

// Marcas del usuario sobre un artista, álbum o canción (openspec: add-header-quick-actions):
// favorito, Pendiente y valoración. Las pide el diálogo de acciones rápidas del Header antes de
// marcar, porque `POST /api/me/favorites` y `/want-to-listen` alternan. Personal: nunca en caché.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const type = SocialTargetTypeSchema.safeParse(searchParams.get("type"));
  const id = searchParams.get("id") ?? "";
  if (!type.success) throw new ApiError("VALIDATION_ERROR", 400, "El tipo de objetivo no es válido");
  if (!isValidUuid(id)) throw new ApiError("VALIDATION_ERROR", 400, "El id del objetivo no es válido");
  const user = await requireUser();
  return NextResponse.json(await getTargetMarks(user.id, type.data, id), { headers: { "Cache-Control": "no-store" } });
});
