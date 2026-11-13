import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { AddLaminaItemRequestSchema, ReorderLaminaRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { addLaminaItem, addLaminaItems, ownedLaminaKind, reorderLamina } from "@/services/laminas/laminas";
import { addTierListItem } from "@/services/laminas/tiers";

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
  // Una tier list agrega de a uno, en el nivel de la nota del dueño (add-tier-list-lamina-phase2).
  if ((await ownedLaminaKind(id, user.id)) === "tier") {
    if (!("targetId" in body)) throw new ApiError("VALIDATION_ERROR", 400, "Una tier list agrega de a un ítem");
    return NextResponse.json({ tierList: await addTierListItem(id, user.id, body.targetId) });
  }
  const lamina = "targetIds" in body ? await addLaminaItems(id, user.id, body.targetIds) : await addLaminaItem(id, user.id, body.targetId);
  return NextResponse.json({ lamina });
});

export const PUT = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { id, body } = await parse(request, context, ReorderLaminaRequestSchema);
  const user = await requireUser();
  return NextResponse.json({ lamina: await reorderLamina(id, user.id, body.itemIds) });
});
