import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ApplyAudienceRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { applyAudienceToExisting, previewApplyAudience } from "@/services/social/apply-audience";

// Vista previa (solo lectura) de "Aplicar a lo existente": cuántos elementos de
// cada tipo cambiarían y cuántos están fijados o destacados (spec
// default-audience, "Vista previa de la acción de aplicar").
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ApplyAudienceRequestSchema.safeParse({
    audience: request.nextUrl.searchParams.get("audience") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida");
  }
  return NextResponse.json(await previewApplyAudience(user.id, parsed.data.audience));
});

// Aplica la audiencia a todo el contenido de biblioteca existente del usuario
// (spec default-audience, "Aplicar la audiencia a todo lo existente").
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ApplyAudienceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida");
  }
  return NextResponse.json(await applyAudienceToExisting(user.id, parsed.data.audience));
});
