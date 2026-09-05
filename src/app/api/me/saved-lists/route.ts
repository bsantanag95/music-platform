import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { SaveListRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { listSavedLists, saveList } from "@/services/lists/saved-lists";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listSavedLists(user.id, page, pageSize));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = SaveListRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El guardado no es válido");
  }
  const user = await requireUser();
  const list = await saveList(user.id, parsed.data.listId, parsed.data.following ?? false);
  return NextResponse.json({ list }, { status: 201 });
});
