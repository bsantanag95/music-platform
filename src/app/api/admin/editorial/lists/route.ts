import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CreateEditorialDraftRequestSchema } from "@/lib/api/schemas";
import { requirePermission } from "@/services/auth/authorization";
import { createEditorialDraft, listEditorialLists, type EditorialStatusFilter } from "@/services/lists/editorial";

const STATUS_FILTERS: EditorialStatusFilter[] = ["draft", "submitted", "published", "withdrawn"];

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission("editorial.author");
  const rawStatus = request.nextUrl.searchParams.get("status");
  const status = STATUS_FILTERS.includes(rawStatus as EditorialStatusFilter)
    ? (rawStatus as EditorialStatusFilter)
    : undefined;
  return NextResponse.json({ lists: await listEditorialLists(status) });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateEditorialDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El borrador editorial no es válido");
  }
  const actor = await requirePermission("editorial.author");
  const list = await createEditorialDraft(actor.id, parsed.data);
  return NextResponse.json({ list }, { status: 201 });
});
