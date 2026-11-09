// Invitación de diciembre a "Tu año en discos" (openspec: add-year-in-discs-phase3, D1–D3): del 1 de diciembre al 15 de enero, el año que cierra (el en
// curso en diciembre, el anterior en enero) se ofrece en Inicio y en el diario, y llega una vez como aviso en "Novedades".
//
// La tarjeta se calcula con la zona del pedido. El envío corre en un script sin zona: emite desde el 1 de diciembre a las 12:00 UTC (a esa hora ya es 1
// de diciembre en todas las zonas habitadas) hasta el 16 de enero a las 12:00 UTC, y cuenta las escuchas del año en UTC: solo decide si la persona escuchó
// algo ese año, y la diferencia de zona afecta únicamente a las escuchas del borde.

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { YEAR_MAX, YEAR_MIN } from "./year";

/** Cookie con el último año cuya tarjeta se descartó: una comodidad de la pantalla, no un dato de la cuenta. */
export const YEAR_INVITE_DISMISSED_COOKIE = "year_invite_dismissed";

/** Último día de enero en que sigue la invitación del año anterior. */
const LAST_JANUARY_DAY = 15;

function inRange(year: number): number | null {
  return year >= YEAR_MIN && year <= YEAR_MAX ? year : null;
}

/** Año que cierra si `now` cae en la ventana en esa zona, o `null`. */
export function yearInvitationFor(now: Date, timeZone: string): number | null {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "numeric", day: "numeric", timeZone }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (month === 12) return inRange(year);
  if (month === 1 && day <= LAST_JANUARY_DAY) return inRange(year - 1);
  return null;
}

/** Año del envío del aviso si `now` cae en la ventana UTC del script, o `null`. */
export function yearInvitationSendYear(now: Date): number | null {
  const year = now.getUTCFullYear();
  if (now.getTime() >= Date.UTC(year, 11, 1, 12)) return inRange(year);
  if (now.getTime() < Date.UTC(year, 0, LAST_JANUARY_DAY + 1, 12)) return inRange(year - 1);
  return null;
}

/** Año descartado guardado en la cookie, o `null` si no hay uno válido. */
export function parseDismissedYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  return inRange(Number(value));
}

export interface YearInvitation {
  year: number;
  /** En diciembre el año todavía corre: "hasta ahora". */
  inProgress: boolean;
}

/**
 * La tarjeta para una persona con sesión, o `null`: fuera de la ventana, descartada para ese año, sin escuchas visibles ese año (las de discos ocultos no
 * cuentan) o con el año ya compartido. Una sola consulta acotada por el índice de escuchas por usuario y fecha.
 */
export async function readYearInvitation(
  userId: string,
  timeZone: string,
  dismissedYear: number | null,
  now: Date = new Date(),
): Promise<YearInvitation | null> {
  const year = yearInvitationFor(now, timeZone);
  if (year === null || dismissedYear === year) return null;
  const [row] = await db.execute<{ show: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM listen_entry le
      WHERE le.user_id = ${userId}::uuid
        AND le.created_at >= make_timestamptz(${year}::int, 1, 1, 0, 0, 0, ${timeZone}::text)
        AND le.created_at < make_timestamptz(${year + 1}::int, 1, 1, 0, 0, 0, ${timeZone}::text)
        AND (le.release_group_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM year_hidden yh WHERE yh.user_id = le.user_id AND yh.year = ${year}::int AND yh.release_group_id = le.release_group_id))
    ) AND NOT EXISTS (
      SELECT 1 FROM year_share ys WHERE ys.user_id = ${userId}::uuid AND ys.year = ${year}::int
    ) AS show`);
  if (!row?.show) return null;
  return { year, inProgress: year === Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(now)) };
}

export interface SendYearInvitationsResult {
  /** Año del envío, o `null` fuera de la ventana. */
  year: number | null;
  /** Cuentas que reciben el aviso en esta corrida (sin las que ya lo tenían). */
  sent: number;
}

/**
 * Crea el aviso `year_in_discs` del año que cierra para cada cuenta activa con al menos una escucha ese año y la preferencia activa (lo está por
 * defecto: solo una fila con `enabled = false` la apaga). Idempotente por el único `(recipient_id, kind, year)`. Con `dryRun`, solo cuenta.
 */
export async function sendYearInvitations(
  options: { now?: Date; dryRun?: boolean; /** Solo estas cuentas (el smoke test, para no tocar al resto de la BD). */ onlyUserIds?: readonly string[] } = {},
): Promise<SendYearInvitationsResult> {
  const year = yearInvitationSendYear(options.now ?? new Date());
  if (year === null) return { year: null, sent: 0 };
  const only = options.onlyUserIds
    ? sql`AND u.id IN (${sql.join(options.onlyUserIds.map((id) => sql`${id}::uuid`), sql`, `)})`
    : sql``;

  const candidates = sql`
    SELECT u.id
    FROM app_user u
    WHERE u.deactivated_at IS NULL ${only}
      AND EXISTS (
        SELECT 1 FROM listen_entry le
        WHERE le.user_id = u.id
          AND le.created_at >= make_timestamptz(${year}::int, 1, 1, 0, 0, 0, 'UTC')
          AND le.created_at < make_timestamptz(${year + 1}::int, 1, 1, 0, 0, 0, 'UTC'))
      AND NOT EXISTS (
        SELECT 1 FROM notification_preference np
        WHERE np.user_id = u.id AND np.kind = 'year_in_discs' AND np.enabled = false)
      AND NOT EXISTS (
        SELECT 1 FROM notification n
        WHERE n.recipient_id = u.id AND n.kind = 'year_in_discs' AND n.year = ${year}::int)`;

  if (options.dryRun) {
    const [row] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM (${candidates}) c`);
    return { year, sent: Number(row?.n ?? 0) };
  }

  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO notification (recipient_id, kind, year, group_key)
    SELECT c.id, 'year_in_discs', ${year}::int, ${`year:${year}`}
    FROM (${candidates}) c
    ON CONFLICT (recipient_id, kind, year) WHERE year IS NOT NULL DO NOTHING
    RETURNING id`);
  return { year, sent: inserted.length };
}
