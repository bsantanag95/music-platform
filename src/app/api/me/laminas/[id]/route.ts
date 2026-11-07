import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { UpdateLaminaRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { deleteLamina, getOwnedLamina, updateLamina } from "@/services/laminas/laminas";

type Params = { params: Promise<{ id: string }> };

async function readId({ params }: Params): Promise<string> {
  const { id } = await params;
  if (!isValidUuid(id)) throw new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  return id;
}

export const GET = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const id = await readId(context);
  const user = await requireUser();
  return NextResponse.json({ lamina: await getOwnedLamina(id, user.id) });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context: Params) => {
  const id = await readId(context);
  const parsed = UpdateLaminaRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La Lámina no es válida");
  const user = await requireUser();
  if (parsed.data.audience && parsed.data.audience !== "private") await requireSocialActivityAllowed(user.id);
  return NextResponse.json({ lamina: await updateLamina(id, user.id, parsed.data) });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const id = await readId(context);
  const user = await requireUser();
  await deleteLamina(id, user.id);
  return new NextResponse(null, { status: 204 });
});
