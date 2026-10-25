import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { EmailConfigError } from "@/services/email";

// Baja del resumen semanal en un clic (openspec:
// add-notification-digest-and-awards, D5).
//
// El token es `base64url(userId.semana).hmac` firmado con HMAC-SHA256 y
// `EMAIL_UNSUBSCRIBE_SECRET`, comparado en tiempo constante. No expira: darse
// de baja nunca debe fallar por abrir un correo viejo. No sirve para nada más
// que apagar `notification_digest_enabled`; ni siquiera confirma si la cuenta
// existe (un id desconocido responde igual y no toca nada).

const SECRET_ENV = "EMAIL_UNSUBSCRIBE_SECRET";

/** Secreto del enlace de baja; sin él no se puede firmar ni verificar. */
function unsubscribeSecret(): string {
  const secret = process.env[SECRET_ENV];
  if (!secret) throw new EmailConfigError();
  return secret;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", unsubscribeSecret()).update(payload).digest();
}

export interface UnsubscribeToken {
  userId: string;
  /** Semana en que se emitió (`YYYY-MM-DD`); informativa, no caduca. */
  issuedWeek: string;
}

/**
 * Firma el token de baja de una persona. `issuedWeek` es la fecha con la que se
 * identifica la emisión (el fin de la ventana del resumen).
 */
export function unsubscribeToken(userId: string, issuedWeek: string): string {
  const encoded = Buffer.from(`${userId}.${issuedWeek}`, "utf8").toString("base64url");
  const mac = sign(encoded).toString("base64url");
  return `${encoded}.${mac}`;
}

/**
 * Verifica y decodifica un token. Devuelve `null` si está alterado, si lo firmó
 * otro secreto o si su contenido no tiene la forma esperada.
 */
export function readUnsubscribeToken(token: string): UnsubscribeToken | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const encoded = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = sign(encoded);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const separator = payload.indexOf(".");
  if (separator <= 0) return null;

  const userId = payload.slice(0, separator);
  const issuedWeek = payload.slice(separator + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedWeek)) return null;

  return { userId, issuedWeek };
}

/**
 * Verifica un token sin tocar la base: la página de confirmación lo usa en un
 * `GET` (un escáner de enlaces no debe dar de baja a nadie). Sin secreto
 * configurado no hay enlace válido y falla cerrado.
 */
export function isValidUnsubscribeToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    return readUnsubscribeToken(token) !== null;
  } catch {
    return false;
  }
}

/**
 * Da de baja el resumen a partir del token. Un token inválido responde
 * `400 INVALID_UNSUBSCRIBE_TOKEN` sin distinguir si la cuenta existe.
 */
export async function unsubscribeFromDigest(token: string): Promise<void> {
  const parsed = readUnsubscribeToken(token);
  if (!parsed) {
    throw new ApiError(
      "INVALID_UNSUBSCRIBE_TOKEN",
      400,
      'El valor de "token" no es válido',
    );
  }

  await db
    .update(appUser)
    .set({ notificationDigestEnabled: false })
    .where(eq(appUser.id, parsed.userId));
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Página de confirmación de la baja (un `GET` no cambia estado). */
export function unsubscribePageUrl(locale: string, token: string): string {
  return `${appUrl()}/${locale}/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Endpoint de un clic (RFC 8058), el de la cabecera `List-Unsubscribe`. */
export function unsubscribeApiUrl(token: string): string {
  return `${appUrl()}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}
