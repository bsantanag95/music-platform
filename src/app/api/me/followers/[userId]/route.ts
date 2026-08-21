import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requireUser } from "@/services/auth/authorization";
import { removeFollower } from "@/services/social/following";

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ userId: string }> }) => {
  const { userId } = await context.params;
  if (!isValidUuid(userId)) throw new ApiError("VALIDATION_ERROR", 400, "El identificador no es válido");
  const user = await requireUser();
  await removeFollower(user.id, userId);
  return new NextResponse(null, { status: 204 });
});