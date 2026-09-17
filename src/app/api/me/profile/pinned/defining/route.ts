import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { DefiningTargetRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { clearDefiningEntity, getShowcase, setDefiningEntity } from "@/services/profiles/showcase";

// PUT marca el artista o álbum dado como "me define" en la Tarjeta de
// Identidad, exclusivo por tipo — marcar uno nuevo desmarca el anterior del
// mismo tipo (spec `profile-showcase`, "Marcar un destacado como
// definitorio"). No requiere que la entidad sea un destacado o un favorito.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const parsed = DefiningTargetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El destacado no es válido");
  }
  const user = await requireUser();
  await setDefiningEntity(user.id, parsed.data.type, parsed.data.id);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});

// DELETE quita el marcador del tipo dado, sin afectar destacados ni
// favoritos.
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const parsed = DefiningTargetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El destacado no es válido");
  }
  const user = await requireUser();
  await clearDefiningEntity(user.id, parsed.data.type);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});
