import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReplaceProfileLinksRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { replaceLinks } from "@/services/profiles/identity";

// PUT reemplaza el conjunto ordenado de enlaces externos del perfil (0..5).
// La posición se deriva del orden del array.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ReplaceProfileLinksRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los enlaces del perfil no son válidos");
  }
  const links = await replaceLinks(user.id, parsed.data.links);
  return NextResponse.json({ links });
});

// DELETE vacía todos los enlaces (equivale a PUT con lista vacía).
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  const links = await replaceLinks(user.id, []);
  return NextResponse.json({ links });
});
