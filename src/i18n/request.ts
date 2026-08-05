import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale = routing.locales.includes(locale as "es" | "en")
    ? (locale as "es" | "en")
    : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    messages: {
      common: (await import(`../../messages/${resolvedLocale}/common.json`)).default,
      catalog: (await import(`../../messages/${resolvedLocale}/catalog.json`)).default,
      errors: (await import(`../../messages/${resolvedLocale}/errors.json`)).default,
    },
  };
});
