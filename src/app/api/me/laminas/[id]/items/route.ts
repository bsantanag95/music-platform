import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { AddLaminaItemRequestSchema, ReorderLaminaRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { addLaminaItem, addLaminaItems, reorderLamina } from "@/services/laminas/laminas";

type Params = { params: Promise<{ id: string }> };

async function parse<T>(request: NextRequest, context: Params, schema: z.ZodType<T>): Promise<{ id: string; body: T }> {
  const { id } = await context.params;
  if (!isValidUuid(id)) throw new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El pedido no es válido");
  return { id, body: parsed.data };
}

export const POST = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { id, body } = await parse(request, context, AddLaminaItemRequestSchema);
  const user = await requireUser();
  const lamina = "targetIds" in body ? await addLaminaItems(id, user.id, body.targetIds) : await addLaminaItem(id, user.id, body.targetId);
  return NextResponse.json({ lamina });
});

export const PUT = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { id, body } = await parse(request, context, ReorderLaminaRequestSchema);
  const user = await requireUser();
  return NextResponse.json({ lamina: await reorderLamina(id, user.id, body.itemIds) });
});
