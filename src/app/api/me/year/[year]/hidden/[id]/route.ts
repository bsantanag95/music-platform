import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { requestTimeZone } from "@/lib/request-time-zone";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { hideYearDisc, parseYear, showYearDisc } from "@/services/laminas/year";

// Ocultar y volver a mostrar un disco de "Tu año en discos" (openspec: add-year-in-discs-phase2). Ocultar exige que el disco tenga escuchas ese año, en la
// zona del dueño. No toca el diario.

type Params = { params: Promise<{ year: string; id: string }> };

async function read({ params }: Params): Promise<{ year: number; id: string }> {
  const { year: rawYear, id } = await params;
  const year = parseYear(rawYear);
  if (year === null) throw new ApiError("YEAR_NOT_FOUND", 404, "El año no existe");
  if (!isValidUuid(id)) throw new ApiError("VALIDATION_ERROR", 400, "El disco no es válido");
  return { year, id };
}

export const POST = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const { year, id } = await read(context);
  const user = await requireUser();
  await hideYearDisc(user.id, year, id, await requestTimeZone());
  return new NextResponse(null, { status: 204 });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const { year, id } = await read(context);
  const user = await requireUser();
  await showYearDisc(user.id, year, id);
  return new NextResponse(null, { status: 204 });
});
