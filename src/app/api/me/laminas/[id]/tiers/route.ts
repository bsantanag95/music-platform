import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { ArrangeTierListRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { arrangeTierList } from "@/services/laminas/tiers";

type Params = { params: Promise<{ id: string }> };

/** Guarda la disposición completa de una tier list propia (openspec: add-tier-list-lamina-phase1). */
export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { id } = await params;
  if (!isValidUuid(id)) throw new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  const parsed = ArrangeTierListRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La disposición no es válida");
  const user = await requireUser();
  return NextResponse.json({ tierList: await arrangeTierList(id, user.id, parsed.data) });
});
