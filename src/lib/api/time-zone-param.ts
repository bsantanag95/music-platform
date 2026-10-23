import { ApiError } from "@/lib/api/errors";
import { parseTimeZone } from "@/lib/time-zone";

// `tz` opcional de las lecturas propias que dependen de la zona horaria (día
// del diario, día de los seguidores en la bandeja de notificaciones): zona IANA
// en la que se cuenta el día. Ausente → `undefined` (el servicio usa UTC);
// presente pero desconocida → 400, igual que el resto de los filtros, en vez de
// filtrar en silencio con otra zona.
export function parseTimeZoneParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get("tz");
  if (value === null) return undefined;
  const zone = parseTimeZone(value);
  if (!zone) throw new ApiError("VALIDATION_ERROR", 400, 'El valor de "tz" no es válido');
  return zone;
}
