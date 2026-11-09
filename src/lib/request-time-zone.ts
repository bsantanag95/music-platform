import { cookies } from "next/headers";
import { DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE, parseTimeZone } from "./time-zone";

/**
 * Zona horaria de quien hace el pedido, desde la cookie `tz` (openspec: redesign-diary-page, D1); UTC si no hay una válida o si no hay pedido (un
 * script). La usan las lecturas del dueño que no pasan por next-intl, como su imagen privada o el gesto de compartir su año.
 */
export async function requestTimeZone(): Promise<string> {
  try {
    return parseTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value) ?? DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
