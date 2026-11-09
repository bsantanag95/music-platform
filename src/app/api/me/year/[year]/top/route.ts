import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { requestTimeZone } from "@/lib/request-time-zone";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { YEAR_TOP_SIZE, clearYearTop, parseYear, saveYearTop } from "@/services/laminas/year";

// Top 5 de "Tu año en discos" (openspec: add-year-in-discs-phase2). `PUT` guarda el elegido; `DELETE` vuelve al prellenado. Los discos se validan en la
// zona del dueño (cookie `tz`), la misma con la que ve su año.

type Params = { params: Promise<{ year: string }> };

const BodySchema = z.object({ releaseGroupIds: z.array(z.uuid()).min(1).max(YEAR_TOP_SIZE) });

async function readYear({ params }: Params): Promise<number> {
  const year = parseYear((await params).year);
  if (year === null) throw new ApiError("YEAR_NOT_FOUND", 404, "El año no existe");
  return year;
}

export const PUT = withErrorHandling(async (request: NextRequest, context: Params) => {
  const year = await readYear(context);
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El Top 5 no es válido");
  const user = await requireUser();
  await saveYearTop(user.id, year, parsed.data.releaseGroupIds, await requestTimeZone());
  return new NextResponse(null, { status: 204 });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: Params) => {
  const year = await readYear(context);
  const user = await requireUser();
  await clearYearTop(user.id, year);
  return new NextResponse(null, { status: 204 });
});
