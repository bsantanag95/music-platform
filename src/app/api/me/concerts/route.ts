import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CreateConcertRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { addConcert, listOwnConcerts } from "@/services/concerts/concerts";

// Mis conciertos (openspec: add-my-concerts): lista propia (opcionalmente de un artista) y registro de un concierto.

export const GET = withErrorHandling(async (request: NextRequest) => {
  const artistId = new URL(request.url).searchParams.get("artistId");
  if (artistId !== null && !z.uuid().safeParse(artistId).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El artista no es válido");
  }
  const user = await requireUser();
  return NextResponse.json(await listOwnConcerts(user.id, artistId ? { artistId } : {}));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = CreateConcertRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El concierto no es válido");
  const user = await requireUser();
  const entry = await addConcert(user.id, parsed.data);
  return NextResponse.json({ entry }, { status: 201 });
});
