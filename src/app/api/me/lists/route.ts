import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateListRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { createList, listMyLists, type ListFilters } from "@/services/lists/lists";
import { LIST_ENTITY_TYPES, LIST_SORTS } from "@/services/lists/types";

function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = searchParams.get(key);
  if (value === null || value === "") return undefined;
  if (!allowed.includes(value as T)) {
    throw new ApiError("VALIDATION_ERROR", 400, `El valor de "${key}" no es válido`);
  }
  return value as T;
}

function parseListFilters(searchParams: URLSearchParams): ListFilters {
  const q = searchParams.get("q")?.trim();
  return {
    q: q ? q : undefined,
    entityType: parseEnumParam(searchParams, "entityType", LIST_ENTITY_TYPES),
    sort: parseEnumParam(searchParams, "sort", LIST_SORTS),
  };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseListFilters(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listMyLists(user.id, page, pageSize, filters));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateListRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La lista no es válida");
  }
  const user = await requireUser();
  const list = await createList({
    ownerId: user.id,
    entityType: parsed.data.entityType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    audience: parsed.data.audience,
  });
  return NextResponse.json({ list }, { status: 201 });
});
