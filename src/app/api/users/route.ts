import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { getCurrentUser } from "@/services/auth/authorization";
import { searchUsers } from "@/services/social/profiles";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const { page, pageSize } = parsePagination(searchParams);
  const viewer = await getCurrentUser();
  return NextResponse.json(await searchUsers(q, viewer?.id ?? null, page, pageSize));
});