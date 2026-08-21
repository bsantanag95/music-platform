import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateProfileVisibilityRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { getOwnProfile, updateProfileVisibility } from "@/services/social/profiles";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json({ user: await getOwnProfile(user.id) });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = UpdateProfileVisibilityRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La visibilidad de perfil no es válida");
  }
  return NextResponse.json({
    user: await updateProfileVisibility(user.id, parsed.data.profileVisibility),
  });
});