import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CreateCaminoRequestSchema } from "@/lib/api/schemas";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { createCamino, listMyCaminos } from "@/services/camino/camino";
import { listTrackedLists } from "@/services/lists/saved-lists";

// Listado combinado: Caminos dinámicos propios + listas ajenas trackeadas
// (Requirement "Listado propio en /me/caminos").
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const [caminos, trackedLists] = await Promise.all([
    listMyCaminos(user.id),
    listTrackedLists(user.id),
  ]);
  return NextResponse.json({ caminos, trackedLists });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateCaminoRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El Camino no es válido");
  }
  const user = await requireUser();
  if (parsed.data.audience !== "private") await requireSocialActivityAllowed(user.id);
  const camino = await createCamino(user.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    audience: parsed.data.audience,
  });
  return NextResponse.json({ camino }, { status: 201 });
});
