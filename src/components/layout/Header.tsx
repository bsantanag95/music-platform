"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Encabezado global del catálogo. Client Component porque el selector de
// idioma necesita `usePathname` y `useRouter` de next-intl para preservar
// la ruta y los parámetros dinámicos al cambiar de locale.
export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "es" | "en" });
  };

  return (
    <header className="flex w-full items-center justify-between border-b border-ink-border px-4 py-3">
      <Link
        href="/search"
        className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
      >
        {t("search")}
      </Link>
      <nav aria-label={t("localeSwitcher")} className="flex items-center gap-2">
        {routing.locales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => handleLocaleChange(locale)}
            className={`font-data text-xs uppercase transition-colors hover:text-paper ${
              locale === currentLocale ? "text-paper" : "text-paper-muted"
            }`}
            aria-label={locale}
            aria-current={locale === currentLocale ? "true" : undefined}
          >
            {locale}
          </button>
        ))}
      </nav>
    </header>
  );
}
