import { ApiError } from "@/lib/api/errors";
import { parseTimeZone } from "@/lib/time-zone";

// `tz` opcional de las lecturas del diario propio (openspec: redesign-diary-page,
// D1): zona IANA en la que se cuentan año y mes. Ausente → `undefined` (el
// servicio usa UTC); presente pero desconocida → 400, igual que el resto de los
// filtros, en vez de filtrar en silencio con otra zona.
export function parseTimeZoneParam(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get("tz");
  if (value === null) return undefined;
  const zone = parseTimeZone(value);
  if (!zone) throw new ApiError("VALIDATION_ERROR", 400, 'El valor de "tz" no es válido');
  return zone;
}
