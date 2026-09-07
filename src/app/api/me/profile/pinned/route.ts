import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReplacePinnedRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { getShowcase, replacePinned } from "@/services/profiles/showcase";

// PUT reemplaza el conjunto ordenado de destacados del perfil (0..4). El orden
// del array define la posición.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ReplacePinnedRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los destacados del perfil no son válidos");
  }
  await replacePinned(user.id, parsed.data.items);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});

// DELETE vacía todos los destacados.
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  await replacePinned(user.id, []);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});
