import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { resolveSession } from "@/services/auth/sessions";
import { getUserListDetail } from "@/services/lists/lists";
import { z } from "zod";

export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ username: string; listId: string }> },
  ) => {
    const { username, listId } = await context.params;
    if (!z.uuid().safeParse(listId).success) {
      throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
    }
    const session = await resolveSession();
    const list = await getUserListDetail(username, listId, session?.user.id ?? null);
    return NextResponse.json({ list });
  },
);