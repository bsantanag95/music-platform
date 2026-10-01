import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { MyRatingsFiltersSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { listMyRatings } from "@/services/ratings/my-ratings";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);

  const rawStars = searchParams.get("stars");
  const rawYear = searchParams.get("year");
  const rawDecade = searchParams.get("decade");

  const parsedFilters = MyRatingsFiltersSchema.safeParse({
    sort: searchParams.get("sort") || undefined,
    stars: rawStars ? Number(rawStars) : undefined,
    type: searchParams.get("type") || undefined,
    year: rawYear ? Number(rawYear) : undefined,
    decade: rawDecade ? Number(rawDecade) : undefined,
  });
  if (!parsedFilters.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los filtros no son válidos");
  }

  const user = await requireUser();
  return NextResponse.json(
    await listMyRatings(user.id, page, pageSize, parsedFilters.data),
  );
});
