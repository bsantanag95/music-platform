"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE, parseTimeZone } from "@/lib/time-zone";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

// Guarda la zona horaria del navegador en la cookie `tz` para que el servidor
// formatee fechas en la zona del usuario (openspec: redesign-diary-page, D1).
// No refresca la página: la primera visita se resuelve en UTC en servidor y
// cliente por igual (sin desajuste de hidratación), y desde la navegación
// siguiente todo sale en la zona local. No es un dato sensible, así que no es
// `HttpOnly` — la escribe el propio cliente.
export function TimeZoneCookie() {
  useEffect(() => {
    const zone = parseTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!zone || readCookie(TIME_ZONE_COOKIE) === zone) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }, []);
  return null;
}
