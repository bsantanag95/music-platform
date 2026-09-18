import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { FavoritesFiltersSchema } from "@/lib/api/schemas";
import { resolveSession } from "@/services/auth/sessions";
import { listUserFavorites } from "@/services/favorites/favorites";

export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ username: string }> }) => {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);

    const parsedFilters = FavoritesFiltersSchema.safeParse({
      q: searchParams.get("q") || undefined,
      type: searchParams.get("type") || undefined,
      audience: searchParams.get("audience") || undefined,
      sort: searchParams.get("sort") || undefined,
    });
    if (!parsedFilters.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "Los filtros no son válidos");
    }

    const session = await resolveSession();
    const result = await listUserFavorites(
      username,
      session?.user.id ?? null,
      page,
      pageSize,
      parsedFilters.data,
    );
    return NextResponse.json(result);
  },
);
