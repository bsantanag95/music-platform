import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { getCurrentUser } from "@/services/auth/authorization";
import { listPopularLists } from "@/services/lists/community";

// Sección "Populares" de `/lists`: listas públicas ordenadas por conteo agregado
// de guardados. Pública; con sesión excluye las listas propias.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await getCurrentUser();
  return NextResponse.json(await listPopularLists(user?.id ?? null, page, pageSize));
});
