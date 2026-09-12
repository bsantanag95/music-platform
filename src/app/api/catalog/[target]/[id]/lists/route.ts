import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { ListEntityTypeSchema } from "@/lib/api/schemas";
import { getCurrentUser } from "@/services/auth/authorization";
import { listPublicListsContainingItem } from "@/services/lists/discovery";
import { PUBLIC_LIST_SORTS, type PublicListSort } from "@/services/lists/types";
import { z } from "zod";

async function target(params: Promise<{ target: string; id: string }>) {
  const { target: rawTarget, id } = await params;
  const type = ListEntityTypeSchema.safeParse(rawTarget);
  if (!type.success || !z.uuid().safeParse(id).success) {
    throw new ApiError("INVALID_TARGET", 400, "El objetivo no es válido");
  }
  return { type: type.data, id };
}

function parseSort(searchParams: URLSearchParams): PublicListSort {
  const sort = searchParams.get("sort");
  if (sort === null) return "popular";
  if (!PUBLIC_LIST_SORTS.includes(sort as PublicListSort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  return sort as PublicListSort;
}

// Listas públicas que contienen este artista/álbum/canción — acción "Mostrar
// en listas" (openspec: show-item-in-lists). Incluye las listas propias del
// lector (a diferencia de /api/lists/discover): acá la pregunta es "¿dónde
// aparece esto?", no "qué hay nuevo". Orden por defecto: popularidad
// (guardados), igual que "Populares" — `sort=recent` para cronológico.
export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
    const resolved = await target(context.params);
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams);
    const sort = parseSort(searchParams);
    const user = await getCurrentUser();
    return NextResponse.json(
      await listPublicListsContainingItem(user?.id ?? null, resolved, page, pageSize, sort),
    );
  },
);
