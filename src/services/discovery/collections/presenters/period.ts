// Períodos de las colecciones (`period_key`) interpretados para presentarlas (openspec:
// add-remaining-collection-presenters). Puro y sin base de datos. Un período que no se puede interpretar devuelve
// `null` y el presentador se abstiene: nunca un resumen con un mes inventado.

/** Intervalo `[start, end)` en UTC, como instantes ISO (`YYYY-MM-DDT00:00:00.000Z`). */
export interface PeriodBounds {
  start: string;
  end: string;
}

const iso = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 1)).toISOString();

/** `AAAA-MM`: un mes natural. */
export function monthPeriod(periodKey: string | null): { year: number; month: number; bounds: PeriodBounds } | null {
  const match = periodKey ? /^(\d{4})-(\d{2})$/.exec(periodKey) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month, bounds: { start: iso(year, month - 1), end: iso(year, month) } };
}

/** `AAAA-Qn`: un trimestre natural. */
export function quarterPeriod(periodKey: string | null): { year: number; quarter: number; bounds: PeriodBounds } | null {
  const match = periodKey ? /^(\d{4})-Q([1-4])$/.exec(periodKey) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return { year, quarter, bounds: { start: iso(year, (quarter - 1) * 3), end: iso(year, quarter * 3) } };
}

/** `AAAA-Www-<familia>`: la semana ISO y la familia de géneros de "Para entrar a …". */
export function spotlightPeriod(periodKey: string | null): { family: string } | null {
  const match = periodKey ? /^\d{4}-W\d{2}-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(periodKey) : null;
  return match ? { family: match[1]! } : null;
}

/** Primer día de un mes `AAAA-MM` como fecha (`AAAA-MM-01`), para formatearlo como encabezado. */
export const firstOfMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-01`;
