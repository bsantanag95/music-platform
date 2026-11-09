import { cookies } from "next/headers";
import { requestTimeZone } from "@/lib/request-time-zone";
import {
  YEAR_INVITE_DISMISSED_COOKIE,
  parseDismissedYear,
  readYearInvitation,
  type YearInvitation,
} from "@/services/laminas/year-invitation";

/**
 * La tarjeta de diciembre para el pedido en curso (openspec: add-year-in-discs-phase3, D2): la zona de la cookie `tz` y el año descartado de su cookie.
 * Un fallo de lectura no rompe la página que la pinta: sin tarjeta.
 */
export async function yearInvitationForRequest(userId: string): Promise<YearInvitation | null> {
  try {
    const [timeZone, store] = await Promise.all([requestTimeZone(), cookies()]);
    return await readYearInvitation(userId, timeZone, parseDismissedYear(store.get(YEAR_INVITE_DISMISSED_COOKIE)?.value));
  } catch (error) {
    console.error("[year-invitation] no se pudo leer la invitación", error);
    return null;
  }
}
