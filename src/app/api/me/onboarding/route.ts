import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { OnboardingRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { completeOnboarding } from "@/services/onboarding/onboarding";

// POST cierra el onboarding de dos puertas: siembra los Álbumes favoritos de
// la Puerta 1 (posiblemente vacíos) y fija `onboarded_at`. Idempotente: si el
// usuario ya está onboardeado, devuelve el estado vigente sin re-sembrar
// (openspec: add-two-door-onboarding). La Puerta 2 usa POST /api/me/diary.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = OnboardingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos del onboarding no son válidos");
  }
  const state = await completeOnboarding(user.id, parsed.data.albumReleaseGroupIds);
  return NextResponse.json(state);
});
