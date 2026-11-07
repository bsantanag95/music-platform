import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { UpdateLaminaRequestSchema, UpdateTierListRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { deleteLamina, getOwnedLamina, ownedLaminaKind, updateLamina } from "@/services/laminas/laminas";
import { getOwnedTierList, updateTierList } from "@/services/laminas/tiers";

type Params = { params: Promise<{ id: string }> };

async function readId({ params }: Params): Promise<string> {
  const { id } = await params;
  if (!isValidUuid(id)) throw new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  return id;
}

export const GET = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const id = await readId(context);
  const user = await requireUser();
  if ((await ownedLaminaKind(id, user.id)) === "tier") return NextResponse.json({ tierList: await getOwnedTierList(id, user.id) });
  return NextResponse.json({ lamina: await getOwnedLamina(id, user.id) });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context: Params) => {
  const id = await readId(context);
  const body: unknown = await request.json().catch(() => null);
  const user = await requireUser();
  if ((await ownedLaminaKind(id, user.id)) === "tier") {
    const tier = UpdateTierListRequestSchema.safeParse(body);
    if (!tier.success) throw new ApiError("VALIDATION_ERROR", 400, "La tier list no es válida");
    if (tier.data.audience && tier.data.audience !== "private") await requireSocialActivityAllowed(user.id);
    return NextResponse.json({ tierList: await updateTierList(id, user.id, tier.data) });
  }
  const parsed = UpdateLaminaRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La Lámina no es válida");
  if (parsed.data.audience && parsed.data.audience !== "private") await requireSocialActivityAllowed(user.id);
  return NextResponse.json({ lamina: await updateLamina(id, user.id, parsed.data) });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const id = await readId(context);
  const user = await requireUser();
  await deleteLamina(id, user.id);
  return new NextResponse(null, { status: 204 });
});
