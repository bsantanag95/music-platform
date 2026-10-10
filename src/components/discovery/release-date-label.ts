// Fecha de lanzamiento corta para las tarjetas de "Próximos lanzamientos" ("24 oct"; con año si no es
// el actual). `isoDate` es `YYYY-MM-DD` (`release_group.first_release_date`): se interpreta en UTC para
// que la zona horaria del servidor no corra el día.
export function releaseDateLabel(isoDate: string | null, locale: string, today: Date = new Date()): string | undefined {
  if (!isoDate) return undefined;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const sameYear = date.getUTCFullYear() === today.getUTCFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}
