import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { resolveSession } from "@/services/auth/sessions";
import { listUserFavorites } from "@/services/favorites/favorites";

export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);
    const session = await resolveSession();
    const result = await listUserFavorites(username, session?.user.id ?? null, page, pageSize);
    return NextResponse.json(result);
  },
);