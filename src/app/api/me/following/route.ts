import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { requireUser } from "@/services/auth/authorization";
import { listFollowing } from "@/services/social/following";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listFollowing(user.id, page, pageSize));
});