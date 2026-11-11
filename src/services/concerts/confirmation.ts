// Confirmación de un concierto de la comunidad (openspec: add-shared-concerts-phase2, capability `community-concerts`,
// ADR 0058). Un concierto comunitario nace por confirmar y pasa a confirmado cuando lo enlazan 3 personas distintas que
// cuentan, o cuando su enlace de setlist.fm apunta a un setlist del mismo artista y del mismo año. La confirmación es
// pegajosa: quitar asistencias no la deshace; solo la moderación oculta.

import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, concert, concertEntry, concertPerformer, userRestriction } from "@/db/schema";
import { normalizeSearchText } from "@/services/catalog/search/normalize";

/** Personas distintas que cuentan para confirmar (2 era demasiado fácil con una segunda cuenta; 5, inalcanzable). */
export const CONCERT_CONFIRMATIONS_REQUIRED = 3;
/** Antigüedad mínima de la cuenta para crear y para contar como confirmación. */
export const CONCERT_ACCOUNT_MIN_AGE_DAYS = 7;

export type Executor = Pick<typeof db, "select" | "selectDistinct" | "update" | "insert" | "delete" | "execute">;

/**
 * La cuenta de `app_user` cuenta para confirmar y puede crear: activa, email verificado, al menos 7 días y sin
 * suspensión social vigente. Se usa como condición sobre la tabla `app_user` de la consulta.
 */
export function accountCountsSql(now: Date): SQL {
  const minCreatedAt = new Date(now.getTime() - CONCERT_ACCOUNT_MIN_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  return sql`(${appUser.deactivatedAt} IS NULL
    AND ${appUser.emailVerifiedAt} IS NOT NULL
    AND ${appUser.createdAt} <= ${minCreatedAt}::timestamptz
    AND NOT EXISTS (
      SELECT 1 FROM ${userRestriction}
      WHERE ${userRestriction.userId} = "app_user"."id"
        AND ${userRestriction.scope} = 'social_activity'
        AND ${userRestriction.revokedAt} IS NULL
        AND ${userRestriction.startsAt} <= ${nowIso}::timestamptz
        AND (${userRestriction.expiresAt} IS NULL OR ${userRestriction.expiresAt} > ${nowIso}::timestamptz)
    ))`;
}

/** Segmento de artista de setlist.fm a partir de un nombre: "Los Bunkers" → "los-bunkers". */
export function setlistFmArtistSlug(name: string): string {
  return normalizeSearchText(name).replace(/ /g, "-");
}

/**
 * ¿El enlace es la prueba de este concierto? `/setlist/<artista>/<año>/…` con el artista de alguien del cartel y el año
 * de la fecha. Un setlist de otro artista u otro año no prueba nada.
 */
export function setlistProvesConcert(url: string | null, performerNames: string[], eventDate: string): boolean {
  if (!url) return false;
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }
  const match = /^\/setlist\/([^/]+)\/(\d{4})\//.exec(path);
  if (!match) return false;
  const [, slug, year] = match;
  if (year !== eventDate.slice(0, 4)) return false;
  const wanted = decodeURIComponent(slug!).toLowerCase();
  return performerNames.some((name) => setlistFmArtistSlug(name) === wanted);
}

/** Personas distintas enlazadas al concierto que cuentan para confirmarlo. */
export async function countingAttendees(executor: Executor, concertId: string, now: Date = new Date()): Promise<number> {
  const [row] = await executor
    .select({ n: sql<number>`count(distinct ${concertEntry.userId})`.mapWith(Number) })
    .from(concertEntry)
    .innerJoin(appUser, eq(appUser.id, concertEntry.userId))
    .where(and(eq(concertEntry.concertId, concertId), accountCountsSql(now)));
  return row?.n ?? 0;
}

/** Confirmaciones que le faltan a un concierto por confirmar (0 si ya alcanzó el umbral). */
export function missingConfirmations(counting: number): number {
  return Math.max(0, CONCERT_CONFIRMATIONS_REQUIRED - counting);
}

/**
 * Reevalúa un concierto: si es de la comunidad y está por confirmar, lo confirma cuando su setlist lo prueba o cuando
 * alcanza las personas que cuentan. Devuelve el estado resultante (`null` si no existe). Se llama al crearlo, al decir
 * "Estuve ahí" y al fusionar otro en él.
 */
export async function evaluateConfirmation(
  executor: Executor,
  concertId: string,
  now: Date = new Date(),
): Promise<"confirmed" | "pending" | "hidden" | null> {
  const [target] = await executor
    .select({ source: concert.source, status: concert.status, setlistfmUrl: concert.setlistfmUrl, eventDate: concert.eventDate })
    .from(concert)
    .where(eq(concert.id, concertId))
    .limit(1);
  if (!target) return null;
  const status = target.status as "confirmed" | "pending" | "hidden";
  if (target.source !== "community" || status !== "pending") return status;

  let proven = false;
  if (target.setlistfmUrl) {
    const performers = await executor
      .select({ name: concertPerformer.artistName })
      .from(concertPerformer)
      .where(eq(concertPerformer.concertId, concertId))
      .orderBy(asc(concertPerformer.position));
    proven = setlistProvesConcert(target.setlistfmUrl, performers.map((p) => p.name), target.eventDate);
  }
  if (!proven) proven = (await countingAttendees(executor, concertId, now)) >= CONCERT_CONFIRMATIONS_REQUIRED;
  if (!proven) return "pending";

  await executor
    .update(concert)
    .set({ status: "confirmed", confirmedAt: now })
    .where(and(eq(concert.id, concertId), eq(concert.status, "pending"), isNull(concert.mergedIntoId)));
  return "confirmed";
}
