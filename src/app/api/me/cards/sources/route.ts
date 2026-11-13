import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { LaminaSourceQuerySchema } from "@/lib/api/schemas";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { listLaminaSourceOptions } from "@/services/laminas/sources";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const parsed = LaminaSourceQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El pedido no es válido");
  const timeZone = parseTimeZoneParam(searchParams);
  const user = await requireUser();
  return NextResponse.json(await listLaminaSourceOptions(user.id, { ...parsed.data, timeZone }));
});
