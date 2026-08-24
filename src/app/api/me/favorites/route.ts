import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import {
  CreateFavoriteRequestSchema,
  RemoveFavoriteRequestSchema,
  UpdateFavoriteAudienceRequestSchema,
} from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import {
  listMyFavorites,
  resolveFavoriteTarget,
  toggleFavorite,
  removeFavorite,
  updateFavoriteAudience,
} from "@/services/favorites/favorites";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listMyFavorites(user.id, page, pageSize));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateFavoriteRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El favorito no es válido");
  }
  const user = await requireUser();
  const target = await resolveFavoriteTarget(parsed.data.target.type, parsed.data.target.id);
  const favorite = await toggleFavorite(target, user.id, parsed.data.audience);
  return NextResponse.json({ favorite }, { status: favorite ? 201 : 200 });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = UpdateFavoriteAudienceRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida");
  }
  const user = await requireUser();
  const { id } = parsed.data;
  const favorite = await updateFavoriteAudience(id, user.id, parsed.data.audience);
  return NextResponse.json({ favorite });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = RemoveFavoriteRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El favorito no es válido");
  }
  const user = await requireUser();
  await removeFavorite(parsed.data.target, user.id);
  return new NextResponse(null, { status: 204 });
});