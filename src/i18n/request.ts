import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";
import { DEFAULT_TIME_ZONE, TIME_ZONE_COOKIE, parseTimeZone } from "@/lib/time-zone";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale = routing.locales.includes(locale as "es" | "en")
    ? (locale as "es" | "en")
    : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    // Instante de referencia para fechas relativas (`useNow`, `relativeTime`).
    // Sin esto, next-intl cae a `new Date()` por render y avisa
    // `ENVIRONMENT_FALLBACK`; fijarlo acá lo hace consistente servidor/cliente.
    now: new Date(),
    // Zona horaria del usuario desde la cookie `tz` (openspec: redesign-diary-page,
    // D1); sin cookie válida, UTC. `NextIntlClientProvider` la hereda, así que
    // servidor y cliente formatean fechas con la misma zona.
    timeZone: parseTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value) ?? DEFAULT_TIME_ZONE,
    messages: {
      common: (await import(`../../messages/${resolvedLocale}/common.json`)).default,
      catalog: (await import(`../../messages/${resolvedLocale}/catalog.json`)).default,
      auth: (await import(`../../messages/${resolvedLocale}/auth.json`)).default,
      errors: (await import(`../../messages/${resolvedLocale}/errors.json`)).default,
      users: (await import(`../../messages/${resolvedLocale}/users.json`)).default,
      diary: (await import(`../../messages/${resolvedLocale}/diary.json`)).default,
      feed: (await import(`../../messages/${resolvedLocale}/feed.json`)).default,
      favorites: (await import(`../../messages/${resolvedLocale}/favorites.json`)).default,
      wantToListen: (await import(`../../messages/${resolvedLocale}/wantToListen.json`)).default,
      ratings: (await import(`../../messages/${resolvedLocale}/ratings.json`)).default,
      artistJourney: (await import(`../../messages/${resolvedLocale}/artistJourney.json`)).default,
      camino: (await import(`../../messages/${resolvedLocale}/camino.json`)).default,
      lists: (await import(`../../messages/${resolvedLocale}/lists.json`)).default,
      collection: (await import(`../../messages/${resolvedLocale}/collection.json`)).default,
      home: (await import(`../../messages/${resolvedLocale}/home.json`)).default,
      onboarding: (await import(`../../messages/${resolvedLocale}/onboarding.json`)).default,
      footer: (await import(`../../messages/${resolvedLocale}/footer.json`)).default,
      quickActions: (await import(`../../messages/${resolvedLocale}/quickActions.json`)).default,
      legal: (await import(`../../messages/${resolvedLocale}/legal.json`)).default,
      awards: (await import(`../../messages/${resolvedLocale}/awards.json`)).default,
      notifications: (await import(`../../messages/${resolvedLocale}/notifications.json`)).default,
    },
  };
});
