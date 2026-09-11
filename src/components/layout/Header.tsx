"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname, useSearchParams, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { AuthUser } from "@/lib/api/schemas";
import type { Permission } from "@/services/auth/authorization";
import { apiFetch, ApiError } from "@/lib/api/client";
import { LogoutResponseSchema } from "@/lib/api/schemas";
import { HeaderSearch } from "./HeaderSearch";
import { Logo } from "./Logo";
import { UserMenu, UserMenuList } from "./UserMenu";
import { RegisterListenButton } from "@/components/diary/RegisterListenButton";

interface HeaderProps {
  user?: Pick<AuthUser, "id" | "username" | "displayName"> | null;
  exploreEnabled?: boolean;
  /** Solicitudes de seguimiento pendientes, para el badge del menú de usuario. */
  pendingFollowRequests?: number;
  platformPermissions?: Permission[];
}

// Encabezado global del catálogo. Client Component porque el selector de
// idioma necesita `usePathname` y `useRouter` de next-intl para preservar
// la ruta y los parámetros dinámicos al cambiar de locale.
//
// Dos zonas separadas (ver spec cross-view-navigation): la **barra general** de
// navegación de contenido (buscador, Explorar) y, cuando hay sesión, el **menú
// de usuario** anclado al nombre visible que agrupa las superficies personales.
export function Header({
  user = null,
  exploreEnabled = false,
  pendingFollowRequests = 0,
  platformPermissions = [],
}: HeaderProps) {
  const t = useTranslations("common");
  const tExplore = useTranslations("catalog.explore");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentLocale = useLocale();
  const [currentUser, setCurrentUser] = useState(user);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  // Debajo de `md` la barra general y la zona de usuario no entran en una fila:
  // se pliegan en este panel. Ver critique 2026-09-04, hallazgo P1.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Cierra el panel mobile al navegar — cada Link es un cambio de ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleLocaleChange = (newLocale: string) => {
    // Preserva el query string (ej. `?q=` en /search): `usePathname` de next-intl
    // devuelve solo la ruta sin search, y el router no lo añade por sí solo.
    const search = searchParams.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    router.replace(href, { locale: newLocale as "es" | "en" });
    setMenuOpen(false);
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

  const generalNavClass = "font-data text-sm text-paper-muted transition-colors hover:text-paper";
  // Barra general: navegación de contenido que el sitio ofrece a cualquiera.
  // "Listas" es la superficie pública `/lists`, distinta de `/me/lists`.
  const generalLinks = (
    <>
      {exploreEnabled ? (
        <Link href="/explore" className={generalNavClass}>
          {tExplore("navLabel")}
        </Link>
      ) : null}
      <Link href="/lists" className={generalNavClass}>
        {t("lists")}
      </Link>
      {platformPermissions.includes("moderation.review_content") || platformPermissions.includes("moderation.suspend_social") ? (
        <Link href="/moderation" className={generalNavClass}>
          {t("moderation")}
        </Link>
      ) : null}
      {platformPermissions.includes("editorial.author") ? (
        <Link href="/admin" className={generalNavClass}>
          {t("administration")}
        </Link>
      ) : null}
    </>
  );

  return (
    <header className="relative border-b border-ink-border">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <div className="hidden md:block">
            <HeaderSearch />
          </div>
          {/* Barra general: solo navegación de contenido que ofrece el sitio a
              cualquiera. Las superficies personales viven en el menú de usuario. */}
          <nav aria-label={t("generalNav")} className="hidden items-center gap-4 md:flex">
            {generalLinks}
            {currentUser ? <RegisterListenButton /> : null}
          </nav>
        </div>

        {/* Sesión e idioma van juntos al extremo derecho, separados de la navegación
            de contenido: no son "a dónde ir" sino "quién soy / preferencias de la
            app" — mismo patrón que Letterboxd, GitHub, etc. */}
        <div className="hidden items-center gap-4 md:flex">
          <LocaleSwitcher t={t} currentLocale={currentLocale} onChange={handleLocaleChange} />
          {currentUser ? (
            <UserMenu
              username={currentUser.username}
              displayName={currentUser.displayName ?? currentUser.username}
              pendingFollowRequests={pendingFollowRequests}
              logoutPending={logoutPending}
              logoutError={logoutError}
              onLogout={handleLogout}
            />
          ) : (
            <AuthActions t={t} />
          )}
        </div>

        {/* Debajo de `md`, la fila de arriba se reduce a logo + este botón: el
            buscador, la navegación y la zona de usuario se pliegan en el panel
            de abajo en vez de desbordar a 375px. */}
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center text-paper-muted transition-colors hover:text-paper md:hidden"
          aria-expanded={menuOpen}
          aria-controls="header-mobile-menu"
          aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <div
          id="header-mobile-menu"
          className="flex flex-col gap-4 border-t border-ink-border px-4 py-4 md:hidden"
        >
          {/* Bloque 1 — barra general. */}
          <HeaderSearch />
          <nav aria-label={t("generalNav")} className="flex flex-col items-start gap-3">
            {generalLinks}
            {currentUser ? <RegisterListenButton /> : null}
          </nav>

          {/* Bloque 2 — zona de usuario. */}
          <div className="flex flex-col gap-4 border-t border-ink-border pt-4">
            {currentUser ? (
              <UserMenuList
                username={currentUser.username}
                pendingFollowRequests={pendingFollowRequests}
                surface="panel"
                onNavigate={() => setMenuOpen(false)}
                logoutPending={logoutPending}
                logoutError={logoutError}
                onLogout={handleLogout}
              />
            ) : (
              <AuthActions t={t} />
            )}
            <div className="border-t border-ink-border pt-4">
              <LocaleSwitcher t={t} currentLocale={currentLocale} onChange={handleLocaleChange} />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

type HeaderT = (key: string) => string;

function LocaleSwitcher({
  t,
  currentLocale,
  onChange,
}: {
  t: HeaderT;
  currentLocale: string;
  onChange: (locale: string) => void;
}) {
  return (
    <nav aria-label={t("localeSwitcher")} className="flex items-center gap-2">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
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
  );
}

function AuthActions({ t }: { t: HeaderT }) {
  return (
    <div className="flex items-center gap-3 font-data text-xs">
      <Link
        href="/auth/login"
        className="rounded-md border border-ink-border px-3 py-2 text-paper transition-colors hover:border-paper"
      >
        {t("login")}
      </Link>
      <Link
        href="/auth/register"
        className="rounded-md border border-accent bg-accent px-3 py-2 font-medium text-ink transition-colors hover:border-amber-hover hover:bg-amber-hover"
      >
        {t("register")}
      </Link>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  );
}
