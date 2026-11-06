import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { isShareFormat, isShareLocale, isShareTargetKind, type ShareTargetKind } from "@/lib/share/kinds";
import { withErrorHandling } from "@/lib/with-error-handling";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { resolveSession } from "@/services/auth/sessions";
import { isOwnShareKind, loadOwnTarget } from "@/services/share/own";
import { renderShareImage } from "@/services/share/render";
import { loadShareTarget, shareTargetVersion } from "@/services/share/targets";

// Imagen para compartir de un objeto (spec share-images; design D2). Una sola puerta para todos los tipos y
// formatos: valida, limita por IP, carga el objetivo como anónimo y responde el PNG. Un objeto inexistente u
// oculto responde 200 con la imagen genérica (un crawler no muestra nada útil ante un 404).

export const runtime = "nodejs";

const IMAGES_PER_WINDOW = 60;
const IMAGES_WINDOW_MS = 60_000;
const IMMUTABLE = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=300";
/**
 * Lo único que usa la caché inmutable: el catálogo. Lo de una persona lo pueden cerrar su dueño o moderación, y una copia
 * en un CDN seguiría visible. Es una lista cerrada para que un tipo nuevo nazca con la caché corta.
 */
const IMMUTABLE_KINDS: ReadonlySet<ShareTargetKind> = new Set<ShareTargetKind>([
  "album",
  "song",
  "artist",
  "genre",
  "awards",
  "award",
  "ceremony",
  "halls",
  "hall",
  "hall_class",
  "collections",
  "collection",
]);
/** Imagen privada del dueño (spec personal-share-image): nunca entra a una caché compartida. */
const PERSONAL = "private, no-store";

type Params = { params: Promise<{ kind: string; ref: string }> };

export const GET = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { kind, ref } = await params;
  const search = request.nextUrl.searchParams;
  const locale = search.get("locale") ?? "es";
  const format = search.get("format") ?? "link";
  if (!isShareTargetKind(kind) || !isShareLocale(locale) || !isShareFormat(format) || ref.length === 0 || ref.length > 200) {
    throw new ApiError("VALIDATION_ERROR", 400, "Imagen para compartir inválida");
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`share-image:ip:${ip}`], Date.now(), { max: IMAGES_PER_WINDOW, windowMs: IMAGES_WINDOW_MS })) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiadas imágenes pedidas. Probá en un minuto");
  }

  const suffix = format === "story" ? "-story" : "";
  if (search.get("personal") === "1") {
    const session = isOwnShareKind(kind) ? await resolveSession() : null;
    const own = session && isOwnShareKind(kind) ? await loadOwnTarget(kind, ref, locale, session.user.id) : null;
    const headers: Record<string, string> = { "Cache-Control": PERSONAL };
    if (search.get("download") === "1") {
      headers["Content-Disposition"] = `attachment; filename="${own?.downloadName ?? "compartir"}${suffix}.png"`;
    }
    return renderShareImage(own, locale, { format, headers });
  }

  const target = await loadShareTarget(kind, ref, locale);
  const requested = search.get("v");
  const current = target ? shareTargetVersion(target) : null;
  const headers: Record<string, string> = {
    "Cache-Control": IMMUTABLE_KINDS.has(kind) && requested !== null && requested === current ? IMMUTABLE : SHORT,
  };
  if (search.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="${target?.downloadName ?? "compartir"}${suffix}.png"`;
  }
  // Una imagen que salió sin alguna carátula (fuente lenta o caída) no se congela en el CDN.
  return renderShareImage(target, locale, { format, headers, degradedCacheControl: SHORT });
});
