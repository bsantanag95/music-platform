import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { getEmailTransport, type EmailMessage, type EmailTransport } from "@/services/email";
import { buildNotificationDigestEmail } from "@/services/email/templates/notification-digest";
import { buildDigest } from "./digest";
import { unsubscribeApiUrl, unsubscribePageUrl, unsubscribeToken } from "./unsubscribe";

// Envío programado del resumen semanal (openspec:
// add-notification-digest-and-awards, D4).
//
// Una corrida a la vez (lock advisory), destinatarios opt-in con email
// verificado y cuenta activa, envío en serie con una pausa para no superar el
// límite del proveedor, y marca `notification_digest_sent_at` solo después de
// entregar. El fallo de una persona se registra y no corta el lote ni mueve su
// marca: la corrida siguiente lo reintenta.

/** Clave del lock advisory de la corrida. */
const LOCK_KEY = "notification-digest";

/** Pausa entre envíos si `DIGEST_SEND_INTERVAL_MS` no dice otra cosa. */
export const DEFAULT_SEND_INTERVAL_MS = 600;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface SendNotificationDigestsOptions {
  /** Arma y cuenta los resúmenes sin enviar ni mover marcas. */
  dryRun?: boolean;
  /** Transporte inyectable (pruebas); por defecto, el configurado. */
  transport?: EmailTransport;
  /** Pausa entre envíos; `0` en las pruebas. */
  sendIntervalMs?: number;
}

export type SendNotificationDigestsResult =
  | { status: "locked" }
  | {
      status: "done";
      dryRun: boolean;
      /** Personas que cumplían las condiciones al empezar. */
      recipients: number;
      /** Correos entregados al transporte (0 en `dryRun`). */
      sent: number;
      /** Correos que se habrían enviado (solo en `dryRun`). */
      wouldSend: number;
      /** Personas sin nada sin leer en su ventana. */
      empty: number;
      /** Personas cuyo resumen falló (se reintentan la próxima corrida). */
      failed: number;
    };

/**
 * Inicio de la semana actual (lunes 00:00 UTC): quien ya recibió un resumen
 * desde entonces no vuelve a recibirlo en la misma semana.
 */
export function weekStartUtc(now: Date): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function sendIntervalMs(options: SendNotificationDigestsOptions): number {
  if (options.sendIntervalMs !== undefined) return Math.max(0, options.sendIntervalMs);
  const configured = Number(process.env.DIGEST_SEND_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_SEND_INTERVAL_MS;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Corre una tanda del resumen semanal. Si otra corrida tiene el lock, no hace
 * nada. `now` es el fin de la ventana y el valor que se guarda como marca.
 */
export async function sendNotificationDigests(
  now: Date,
  options: SendNotificationDigestsOptions = {},
): Promise<SendNotificationDigestsResult> {
  const dryRun = options.dryRun === true;

  // Lock de sesión sobre una conexión reservada: el pool entrega conexiones
  // distintas a cada consulta, así que un `pg_try_advisory_lock` suelto no
  // garantiza liberarlo en la misma sesión. `reserve()` sí.
  const connection = await db.$client.reserve();
  try {
    const [lock] = await connection`select pg_try_advisory_lock(hashtextextended(${LOCK_KEY}, 0)) as locked`;
    if (lock?.locked !== true) return { status: "locked" };

    try {
      return await runBatch(now, { ...options, dryRun });
    } finally {
      await connection`select pg_advisory_unlock(hashtextextended(${LOCK_KEY}, 0))`;
    }
  } finally {
    connection.release();
  }
}

async function runBatch(
  now: Date,
  options: SendNotificationDigestsOptions,
): Promise<SendNotificationDigestsResult> {
  const dryRun = options.dryRun === true;
  const weekStart = weekStartUtc(now);

  const recipients = await db
    .select({
      id: appUser.id,
      email: appUser.email,
      locale: appUser.locale,
      timezone: appUser.timezone,
      sentAt: appUser.notificationDigestSentAt,
    })
    .from(appUser)
    .where(
      and(
        eq(appUser.notificationDigestEnabled, true),
        isNotNull(appUser.emailVerifiedAt),
        isNull(appUser.deactivatedAt),
        or(
          isNull(appUser.notificationDigestSentAt),
          lt(appUser.notificationDigestSentAt, weekStart),
        ),
      ),
    );

  const result = {
    status: "done" as const,
    dryRun,
    recipients: recipients.length,
    sent: 0,
    wouldSend: 0,
    empty: 0,
    failed: 0,
  };

  if (recipients.length === 0) return result;

  const transport = dryRun ? null : (options.transport ?? getEmailTransport());
  const interval = sendIntervalMs(options);
  const issuedWeek = weekStart.toISOString().slice(0, 10);

  for (const [index, person] of recipients.entries()) {
    try {
      const windowStart = person.sentAt ?? new Date(now.getTime() - WEEK_MS);
      const digest = await buildDigest(person.id, windowStart, now, {
        timeZone: person.timezone,
      });

      let message: EmailMessage | null = null;
      if (digest.total > 0) {
        const locale = person.locale === "en" ? "en" : "es";
        const token = unsubscribeToken(person.id, issuedWeek);
        message = buildNotificationDigestEmail({
          to: person.email,
          locale,
          digest,
          inboxUrl: `${appUrl()}/${locale}/me/notifications`,
          unsubscribeUrl: unsubscribePageUrl(locale, token),
          unsubscribeApiUrl: unsubscribeApiUrl(token),
        });
      }

      if (!message) {
        result.empty += 1;
        continue;
      }

      if (transport) {
        await transport.send(message);
        await db
          .update(appUser)
          .set({ notificationDigestSentAt: now })
          .where(eq(appUser.id, person.id));
        result.sent += 1;
      } else {
        result.wouldSend += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error(
        `No se pudo enviar el resumen a ${person.id}:`,
        error instanceof Error ? error.message : error,
      );
    }

    if (interval > 0 && index < recipients.length - 1) await sleep(interval);
  }

  return result;
}
