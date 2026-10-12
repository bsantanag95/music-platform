import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReorderFeaturedRequestSchema } from "@/lib/api/schemas";
import { requirePermission } from "@/services/auth/authorization";
import { reorderFeatured } from "@/services/discovery/featured";

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReorderFeaturedRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El orden de las destacadas no es válido");
  const actor = await requirePermission("editorial.publish");
  await reorderFeatured(actor.id, parsed.data.listIds);
  return NextResponse.json({ ok: true });
});
