import { NextRequest, NextResponse, after } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { DefiningTargetRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { clearDefiningEntity, getShowcase, setDefiningEntity } from "@/services/profiles/showcase";
import { refreshProfileTone } from "@/services/profiles/tone";

// Tono del perfil (openspec: redesign-user-profile-phase3): al cambiar el álbum
// definitorio se recalcula desde su carátula después de responder, sin demorar el
// editor. Si falla, el perfil conserva el tono anterior (o el ámbar).
function scheduleToneRefresh(userId: string) {
  after(async () => {
    try {
      await refreshProfileTone(userId);
    } catch (error) {
      console.error("[profile-tone] no se pudo recalcular el tono", error);
    }
  });
}

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
  if (parsed.data.type === "release-group") scheduleToneRefresh(user.id);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});

// DELETE quita el marcador del tipo dado, sin afectar destacados ni
// favoritos. Quitar el álbum borra también el tono (en `clearDefiningEntity`).
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const parsed = DefiningTargetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El destacado no es válido");
  }
  const user = await requireUser();
  await clearDefiningEntity(user.id, parsed.data.type);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});
