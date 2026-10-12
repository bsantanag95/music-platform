import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateFeaturedScheduleRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { unfeatureList, updateFeaturedSchedule } from "@/services/discovery/featured";

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("FEATURED_NOT_FOUND", 404, "La colección no está destacada");
  const body: unknown = await request.json().catch(() => null);
  const parsed = UpdateFeaturedScheduleRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La vigencia de la colección no es válida");
  const actor = await requirePermission("editorial.publish");
  const { startsAt, expiresAt, weight } = parsed.data;
  await updateFeaturedSchedule(actor.id, listId, {
    startsAt: startsAt ? new Date(startsAt) : undefined,
    expiresAt: expiresAt === undefined ? undefined : expiresAt === null ? null : new Date(expiresAt),
    weight,
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("FEATURED_NOT_FOUND", 404, "La colección no está destacada");
  const actor = await requirePermission("editorial.publish");
  await unfeatureList(actor.id, listId);
  return new NextResponse(null, { status: 204 });
});
