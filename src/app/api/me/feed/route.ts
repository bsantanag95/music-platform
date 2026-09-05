import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { FEED_KINDS, listFeed, type FeedFilters } from "@/services/feed/feed";

// Mismo criterio que `parseEnumParam` de `/api/me/diary`: 400 en vez de dejar
// pasar un valor que silenciosamente no filtraría nada.
function parseKind(searchParams: URLSearchParams): FeedFilters["kind"] {
  const value = searchParams.get("kind");
  if (value === null) return undefined;
  if (!FEED_KINDS.includes(value as (typeof FEED_KINDS)[number])) {
    throw new ApiError("VALIDATION_ERROR", 400, 'El valor de "kind" no es válido');
  }
  return value as FeedFilters["kind"];
}

function parseFeedFilters(searchParams: URLSearchParams): FeedFilters {
  const q = searchParams.get("q")?.trim();
  const authorId = searchParams.get("authorId")?.trim();
  return {
    kind: parseKind(searchParams),
    authorId: authorId ? authorId : undefined,
    q: q ? q : undefined,
  };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseFeedFilters(searchParams);
  const user = await requireUser();
  const result = await listFeed(user.id, page, pageSize, filters);
  return NextResponse.json(result);
});
