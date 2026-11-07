import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { removeLaminaItem } from "@/services/laminas/laminas";

type Params = { params: Promise<{ id: string; itemId: string }> };

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: Params) => {
  const { id, itemId } = await params;
  if (!isValidUuid(id) || !isValidUuid(itemId)) throw new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  const user = await requireUser();
  return NextResponse.json({ lamina: await removeLaminaItem(id, user.id, itemId) });
});
