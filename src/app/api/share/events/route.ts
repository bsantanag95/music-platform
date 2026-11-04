import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/with-error-handling";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { recordShareEvent, shareEventInputSchema } from "@/services/share/events";

const EVENTS_PER_WINDOW = 30;
const EVENTS_WINDOW_MS = 60_000;

// Registro de un uso de la hoja de compartir (spec share-events). Con o sin sesión; la IP solo vive en el
// limitador en memoria y no se guarda.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`share-event:ip:${ip}`], Date.now(), { max: EVENTS_PER_WINDOW, windowMs: EVENTS_WINDOW_MS })) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados eventos de compartir. Probá en un minuto");
  }

  const body = shareEventInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Evento de compartir inválido");
  }

  await recordShareEvent(body.data);
  return new Response(null, { status: 204 });
});
