import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { requireUser } from "@/services/auth/authorization";
import { listsFromFollowing } from "@/services/lists/community";

// Sección "De usuarios seguidos" de `/lists`: listas visibles de la gente que el
// lector sigue. Requiere sesión (401 AUTH_REQUIRED sin ella).
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listsFromFollowing(user.id, page, pageSize));
});
