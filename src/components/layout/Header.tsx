"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname, useSearchParams, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { AuthUser } from "@/lib/api/schemas";
import { apiFetch, ApiError } from "@/lib/api/client";
import { LogoutResponseSchema } from "@/lib/api/schemas";
import { HeaderSearch } from "./HeaderSearch";
import { Logo } from "./Logo";

interface HeaderProps {
  user?: Pick<AuthUser, "id" | "username" | "displayName"> | null;
}

// Encabezado global del catálogo. Client Component porque el selector de
// idioma necesita `usePathname` y `useRouter` de next-intl para preservar
// la ruta y los parámetros dinámicos al cambiar de locale.
export function Header({ user = null }: HeaderProps) {
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentLocale = useLocale();
  const [currentUser, setCurrentUser] = useState(user);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleLocaleChange = (newLocale: string) => {
    // Preserva el query string (ej. `?q=` en /search): `usePathname` de next-intl
    // devuelve solo la ruta sin search, y el router no lo añade por sí solo.
    const search = searchParams.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    router.replace(href, { locale: newLocale as "es" | "en" });
  };

  const handleLogout = async () => {
    setLogoutError(null);
    setLogoutPending(true);
    try {
      await apiFetch("/api/auth/logout", LogoutResponseSchema, { method: "DELETE" });
      setCurrentUser(null);
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <header className="flex w-full items-center justify-between border-b border-ink-border px-4 py-3">
      <div className="flex items-center gap-4">
        <Logo />
        <HeaderSearch />
        {currentUser ? (
          <Link
            href="/me/diary"
            className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("diary")}
          </Link>
        ) : null}
        {currentUser ? (
          <Link
            href="/me/feed"
            className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("feed")}
          </Link>
        ) : null}
        {currentUser ? (
          <Link
            href="/me/favorites"
            className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("favorites")}
          </Link>
        ) : null}
        {currentUser ? (
          <Link
            href="/me/lists"
            className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("lists")}
          </Link>
        ) : null}
        {currentUser ? (
          <Link
            href="/me/collection"
            className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("collection")}
          </Link>
        ) : null}
      </div>
      {/* Sesión e idioma van juntos al extremo derecho, separados de la navegación de
          contenido: no son "a dónde ir" sino "quién soy / preferencias de la app" — mismo
          patrón que Letterboxd, GitHub, etc. (avatar/cuenta al final). */}
      <div className="flex items-center gap-4">
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
        {currentUser ? (
          <div className="flex items-center gap-3 font-data text-xs">
            <Link
              href={`/users/${encodeURIComponent(currentUser.username)}`}
              className="text-paper transition-colors hover:text-amber"
              aria-label={t("signedInAs")}
            >
              {currentUser.displayName ?? currentUser.username}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutPending}
              className="rounded-md border border-ink-border px-3 py-2 text-paper-muted transition-colors hover:border-paper hover:text-paper disabled:cursor-wait disabled:opacity-60"
            >
              {logoutPending ? t("logoutPending") : t("logout")}
            </button>
            {logoutError && (
              <span role="alert" className="text-danger">
                {tErrors(`${logoutError}.description`)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 font-data text-xs">
            <Link href="/auth/login" className="rounded-md border border-ink-border px-3 py-2 text-paper transition-colors hover:border-paper">
              {t("login")}
            </Link>
            <Link href="/auth/register" className="rounded-md border border-accent bg-accent px-3 py-2 font-medium text-ink transition-colors hover:border-amber-hover hover:bg-amber-hover">
              {t("register")}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
