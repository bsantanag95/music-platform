import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateCollectionEntryRequestSchema } from "@/lib/api/schemas";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { requireUser } from "@/services/auth/authorization";
import { addEntry, listOwnCollection } from "@/services/collection/collection";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseCollectionFilters(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listOwnCollection(user.id, page, pageSize, filters));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateCollectionEntryRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La entrada de colección no es válida");
  }
  const user = await requireUser();
  const entry = await addEntry(user.id, {
    releaseGroupId: parsed.data.releaseGroupId,
    format: parsed.data.format,
    attributes: parsed.data.attributes,
    note: parsed.data.note ?? null,
    audience: parsed.data.audience,
  });
  return NextResponse.json({ entry }, { status: 201 });
});
