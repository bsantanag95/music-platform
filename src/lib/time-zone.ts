// Zona horaria del usuario (openspec: redesign-diary-page, D1). El navegador la
// guarda en la cookie `tz` (`TimeZoneCookie`), next-intl la usa como `timeZone`
// y las rutas del diario la reciben como parámetro `tz`, para que el mes de una
// escucha sea el mismo en el encabezado, en el filtro y en los meses disponibles.
// Sin una zona válida, todo cae a UTC (el comportamiento previo de los rangos).

export const TIME_ZONE_COOKIE = "tz";
export const DEFAULT_TIME_ZONE = "UTC";

// Solo identificadores IANA con nombre ("America/Santiago", "Etc/GMT+3", "UTC").
// Se rechazan los desplazamientos sueltos ("+03:00"), que `Intl` acepta en
// motores recientes pero Postgres interpreta con el signo POSIX invertido.
const IANA_PATTERN = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;

/**
 * Devuelve el nombre canónico de una zona horaria IANA válida, o `null` si el
 * valor no lo es. Sirve tanto para la cookie como para el parámetro `tz`.
 */
export function parseTimeZone(value: string | null | undefined): string | null {
  if (!value || value.length > 64 || !IANA_PATTERN.test(value)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}
