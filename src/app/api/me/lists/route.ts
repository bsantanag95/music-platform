import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateListRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { createList, listMyLists } from "@/services/lists/lists";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listMyLists(user.id, page, pageSize));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateListRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La lista no es válida");
  }
  const user = await requireUser();
  const list = await createList({
    ownerId: user.id,
    entityType: parsed.data.entityType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    audience: parsed.data.audience,
  });
  return NextResponse.json({ list }, { status: 201 });
});