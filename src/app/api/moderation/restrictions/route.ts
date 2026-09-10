import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SocialSuspensionRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { resolveUserByIdentifier, suspendSocialActivity } from "@/services/moderation";
import { listSocialRestrictions } from "@/services/moderation-queries";

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission("moderation.suspend_social");
  const rawUserId = request.nextUrl.searchParams.get("userId");
  if (rawUserId && !isValidUuid(rawUserId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El identificador no es válido");
  }
  const userId = rawUserId ?? undefined;
  return NextResponse.json({ restrictions: await listSocialRestrictions(userId) });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const parsed = SocialSuspensionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La suspensión no es válida");
  const actor = await requirePermission("moderation.suspend_social");
  const userId = parsed.data.userId ?? (await resolveUserByIdentifier(parsed.data.identifier!));
  const restriction = await suspendSocialActivity(
    actor.id,
    userId,
    parsed.data.reason,
    parsed.data.expiresAt,
  );
  return NextResponse.json({ restriction }, { status: 201 });
});
