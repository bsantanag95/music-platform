import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { AddWantedEntriesRequestSchema } from "@/lib/api/schemas";
import { parseWantedFilters } from "@/lib/api/wanted-filters";
import { requireUser } from "@/services/auth/authorization";
import { addWantedEntries, listOwnWanted } from "@/services/collection/wanted";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseWantedFilters(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listOwnWanted(user.id, page, pageSize, filters));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = AddWantedEntriesRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La entrada de deseo no es válida");
  }
  const user = await requireUser();
  const entries = await addWantedEntries(user.id, parsed.data.releaseGroupId, parsed.data.entries);
  return NextResponse.json({ entries }, { status: 201 });
});
