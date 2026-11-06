import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { isShareLocale, isShareTargetKind } from "@/lib/share/kinds";
import { withErrorHandling } from "@/lib/with-error-handling";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { sharePayloadFor } from "@/services/share/metadata";
import { loadShareTarget } from "@/services/share/targets";

// Datos de la hoja de compartir de un objeto, como anónimo (spec share-sheet, "Compartir desde los menús"). La pide la
// hoja al abrirse: mostrar un menú no cuesta consultas. Sin objetivo, `404`.

const REQUESTS_PER_WINDOW = 60;
const WINDOW_MS = 60_000;

type Params = { params: Promise<{ kind: string; ref: string }> };

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { kind, ref } = await params;
  const locale = request.nextUrl.searchParams.get("locale") ?? "es";
  if (!isShareTargetKind(kind) || !isShareLocale(locale) || ref.length === 0 || ref.length > 200) {
    throw new ApiError("VALIDATION_ERROR", 400, "Datos para compartir inválidos");
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`share-payload:ip:${ip}`], Date.now(), { max: REQUESTS_PER_WINDOW, windowMs: WINDOW_MS })) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados pedidos. Probá en un minuto");
  }

  const target = await loadShareTarget(kind, ref, locale);
  if (!target) throw new ApiError("SHARE_TARGET_NOT_FOUND", 404, "Este contenido no se puede compartir");
  return NextResponse.json(sharePayloadFor(target));
});
