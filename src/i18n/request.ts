import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

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
    messages: {
      common: (await import(`../../messages/${resolvedLocale}/common.json`)).default,
      catalog: (await import(`../../messages/${resolvedLocale}/catalog.json`)).default,
      auth: (await import(`../../messages/${resolvedLocale}/auth.json`)).default,
      errors: (await import(`../../messages/${resolvedLocale}/errors.json`)).default,
      users: (await import(`../../messages/${resolvedLocale}/users.json`)).default,
      diary: (await import(`../../messages/${resolvedLocale}/diary.json`)).default,
      feed: (await import(`../../messages/${resolvedLocale}/feed.json`)).default,
      favorites: (await import(`../../messages/${resolvedLocale}/favorites.json`)).default,
      lists: (await import(`../../messages/${resolvedLocale}/lists.json`)).default,
      collection: (await import(`../../messages/${resolvedLocale}/collection.json`)).default,
      home: (await import(`../../messages/${resolvedLocale}/home.json`)).default,
      footer: (await import(`../../messages/${resolvedLocale}/footer.json`)).default,
      legal: (await import(`../../messages/${resolvedLocale}/legal.json`)).default,
    },
  };
});
