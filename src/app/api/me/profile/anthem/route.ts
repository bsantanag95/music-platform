import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SetAnthemRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { clearAnthem, getShowcase, setAnthem } from "@/services/profiles/showcase";

// PUT fija el himno del perfil (una canción elegida manualmente).
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = SetAnthemRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El himno del perfil no es válido");
  }
  await setAnthem(user.id, parsed.data.recordingId);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});

// DELETE quita el himno.
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  await clearAnthem(user.id);
  return NextResponse.json({ showcase: await getShowcase(user.id) });
});
