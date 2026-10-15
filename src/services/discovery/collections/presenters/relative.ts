import { ref } from "./keys";
import type { MessageRef } from "./types";

// Cartelas relativas a hoy, de pasado ("Hace 5 días") y de futuro ("Sale en 9 días"), compartidas por Novedades
// esenciales y Lo que viene (openspec: add-remaining-collection-presenters). Puras: hoy llega inyectado y todo va en UTC
// para que la zona horaria del servidor no corra el día.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días enteros entre una fecha y hoy, ambos en UTC: positivo si la fecha ya pasó, negativo si es futura. */
export function daysSince(isoDate: string, today: Date): number {
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((startOfToday - Date.parse(`${isoDate}T00:00:00Z`)) / DAY_MS);
}

/** "Hoy", "Ayer", "Hace 5 días · 9 oct", "Hace 3 semanas · 22 sep"; una fecha futura cae a la fecha sola. */
export function relativeNote(isoDate: string, today: Date): MessageRef {
  const days = daysSince(isoDate, today);
  if (days < 0) return ref("date", { date: { date: isoDate, style: "short" } });
  if (days === 0) return ref("newReleasesToday");
  if (days === 1) return ref("newReleasesYesterday");
  const date = { date: isoDate, style: "day-month" as const };
  if (days < 7) return ref("newReleasesDaysAgo", { days, date });
  return ref("newReleasesWeeksAgo", { weeks: Math.floor(days / 7), date });
}

/** Hasta cuántos días la cuenta regresiva sigue diciendo días: anticipar un lanzamiento pide el día exacto más tiempo. */
const COUNTDOWN_DAYS = 14;

/**
 * Cuenta regresiva de un lanzamiento: "Sale hoy", "Sale mañana", "Sale en 9 días · 24 oct", "Sale en 3 semanas · 12 nov".
 * Un disco cuya fecha ya pasó (la colección se generó antes) usa la cartela de pasado: dice la verdad en vez de un
 * número negativo.
 */
export function countdownNote(isoDate: string, today: Date): MessageRef {
  const days = -daysSince(isoDate, today);
  if (days < 0) return relativeNote(isoDate, today);
  if (days === 0) return ref("upcomingToday");
  if (days === 1) return ref("upcomingTomorrow");
  const date = { date: isoDate, style: "day-month" as const };
  if (days < COUNTDOWN_DAYS) return ref("upcomingDaysIn", { days, date });
  return ref("upcomingWeeksIn", { weeks: Math.floor(days / 7), date });
}
