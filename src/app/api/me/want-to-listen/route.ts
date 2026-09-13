import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateWantToListenRequestSchema, RemoveWantToListenRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import {
  listMyWantToListen,
  resolveWantToListenTarget,
  toggleWantToListen,
  removeWantToListenEntry,
} from "@/services/want-to-listen/want-to-listen";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);

  const user = await requireUser();
  return NextResponse.json(await listMyWantToListen(user.id, page, pageSize));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateWantToListenRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El objetivo no es válido");
  }
  const user = await requireUser();
  const target = await resolveWantToListenTarget(parsed.data.target.type, parsed.data.target.id);
  const entry = await toggleWantToListen(target, user.id);
  return NextResponse.json({ entry }, { status: entry ? 201 : 200 });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RemoveWantToListenRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El objetivo no es válido");
  }
  const user = await requireUser();
  await removeWantToListenEntry(parsed.data.target, user.id);
  return new NextResponse(null, { status: 204 });
});
