// Pantallas de foco: flujos cortos donde la barra de navegación completa y el pie largo compiten con
// la tarea (hoy, el onboarding). Ahí el Header se reduce a logo + idioma y el Footer a la atribución
// de fuentes y los enlaces legales. `pathname` es el de `@/i18n/navigation` (sin el prefijo de idioma).
const FOCUS_ROUTES = ["/welcome"] as const;

export function isFocusRoute(pathname: string): boolean {
  return FOCUS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
