import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { CreateLaminaRequestSchema, CreateTierListRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { createLamina, listMyLaminas } from "@/services/laminas/laminas";
import { createTierList } from "@/services/laminas/tiers";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json({ laminas: await listMyLaminas(user.id) });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  if (body && typeof body === "object" && "kind" in body && body.kind === "tier") {
    const tier = CreateTierListRequestSchema.safeParse(body);
    if (!tier.success) throw new ApiError("VALIDATION_ERROR", 400, "La tier list no es válida");
    // Nace privada, armada desde una discografía: no abre nada, así que no exige permiso social.
    const user = await requireUser();
    return NextResponse.json({ tierList: await createTierList(user.id, tier.data) }, { status: 201 });
  }
  const parsed = CreateLaminaRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La Lámina no es válida");
  const user = await requireUser();
  // Desde una fuente nace privada: no abre nada, igual que elegir "Solo yo".
  if (parsed.data.audience !== "private" && !parsed.data.targetIds) await requireSocialActivityAllowed(user.id);
  return NextResponse.json({ lamina: await createLamina(user.id, parsed.data) }, { status: 201 });
});
