import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { CreateListenEntryRequestSchema } from "@/lib/api/schemas";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { createListenEntry, listMyDiary, resolveDiaryTarget, type DiaryFilters } from "@/services/diary/diary";
import { DIARY_AUDIENCES, LISTEN_CONTEXTS, LISTEN_REACTIONS } from "@/services/diary/types";

const REACTION_FILTER_VALUES = [...LISTEN_REACTIONS, "none"] as const;

// Valida un query param opcional contra su vocabulario cerrado — mismo criterio que
// `parsePagination` para page/pageSize: 400 en vez de dejar pasar un valor que
// silenciosamente no filtraría nada.
function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = searchParams.get(key);
  if (value === null) return undefined;
  if (!allowed.includes(value as T)) {
    throw new ApiError("VALIDATION_ERROR", 400, `El valor de "${key}" no es válido`);
  }
  return value as T;
}

// Valida un query param numérico opcional dentro de un rango — mismo criterio
// de "400 en vez de dejar pasar algo que no filtraría lo esperado" que
// `parseEnumParam`.
function parseIntParam(
  searchParams: URLSearchParams,
  key: string,
  { min, max }: { min?: number; max?: number } = {},
): number | undefined {
  const value = searchParams.get(key);
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
    throw new ApiError("VALIDATION_ERROR", 400, `El valor de "${key}" no es válido`);
  }
  return parsed;
}

function parseDiaryFilters(searchParams: URLSearchParams): DiaryFilters {
  const q = searchParams.get("q")?.trim();
  return {
    q: q ? q : undefined,
    context: parseEnumParam(searchParams, "context", LISTEN_CONTEXTS),
    reaction: parseEnumParam(searchParams, "reaction", REACTION_FILTER_VALUES),
    audience: parseEnumParam(searchParams, "audience", DIARY_AUDIENCES),
    year: parseIntParam(searchParams, "year", { min: 1900, max: 9999 }),
    month: parseIntParam(searchParams, "month", { min: 1, max: 12 }),
  };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseDiaryFilters(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listMyDiary(user.id, page, pageSize, filters));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateListenEntryRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La escucha no es válida");
  }
  const user = await requireUser();
  await requireSocialActivityAllowed(user.id);
  const target = await resolveDiaryTarget(parsed.data.target.type, parsed.data.target.id);
  const entry = await createListenEntry(target, user.id);
  return NextResponse.json({ entry }, { status: 201 });
});
