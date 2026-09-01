import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { resolveSession } from "@/services/auth/sessions";
import { listProfileCollection } from "@/services/collection/collection";

export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);
    const filters = parseCollectionFilters(searchParams);
    const session = await resolveSession();
    const result = await listProfileCollection(
      username,
      session?.user.id ?? null,
      page,
      pageSize,
      filters,
    );
    return NextResponse.json(result);
  },
);
