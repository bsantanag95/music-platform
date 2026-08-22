import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateListenEntryRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { createListenEntry, listMyDiary, resolveDiaryTarget } from "@/services/diary/diary";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listMyDiary(user.id, page, pageSize));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateListenEntryRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La escucha no es válida");
  }
  const user = await requireUser();
  const target = await resolveDiaryTarget(parsed.data.target.type, parsed.data.target.id);
  const entry = await createListenEntry(target, user.id);
  return NextResponse.json({ entry }, { status: 201 });
});