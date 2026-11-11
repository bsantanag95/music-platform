import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { attendConcert, unattendConcert } from "@/services/concerts/shared";

// "Estuve ahí" en un concierto compartido (openspec: add-shared-concerts-phase1). `POST` enlaza (o crea) el registro
// personal; `DELETE` lo desenlaza y lo borra solo si lo creó la acción y nunca se editó. Un id mal formado responde
// `SHARED_CONCERT_NOT_FOUND`.

const AttendRequestSchema = z.object({ artistId: z.uuid().optional() }).optional();

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
}

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const text = await request.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError("VALIDATION_ERROR", 400, "El cuerpo no es válido");
    }
  }
  const parsed = AttendRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El cuerpo no es válido");
  const user = await requireUser();
  return NextResponse.json(await attendConcert(user.id, id, parsed.data?.artistId ?? null));
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const user = await requireUser();
  await unattendConcert(user.id, id);
  return new NextResponse(null, { status: 204 });
});
