import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { FeatureListRequestSchema } from "@/lib/api/schemas";
import { requirePermission } from "@/services/auth/authorization";
import { featureList, listEligibleForFeature, listFeaturedAdmin } from "@/services/discovery/featured";

export const GET = withErrorHandling(async () => {
  await requirePermission("editorial.author");
  const [featured, eligible] = await Promise.all([listFeaturedAdmin(), listEligibleForFeature()]);
  return NextResponse.json({ featured, eligible });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = FeatureListRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La colección destacada no es válida");
  const actor = await requirePermission("editorial.publish");
  const { listId, family, startsAt, expiresAt, weight } = parsed.data;
  await featureList(actor.id, listId, {
    family,
    startsAt: startsAt ? new Date(startsAt) : undefined,
    expiresAt: expiresAt === undefined ? undefined : expiresAt === null ? null : new Date(expiresAt),
    weight,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});
