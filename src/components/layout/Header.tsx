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
import { UserAvatar } from "@/components/social/UserAvatar";

interface HeaderProps {
  user?: (Pick<AuthUser, "id" | "username" | "displayName"> & { avatarUrl?: string | null }) | null;
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
  const tCamino = useTranslations("camino");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentLocale = useLocale();
  const [currentUser, setCurrentUser] = useState(user);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  // Debajo de `lg` la barra general y la zona de usuario no entran en una fila:
  // se pliegan en este panel. Ver critique 2026-09-04, hallazgo P1, y
  // fix-header-overflow (con sesión la fila necesita ~835 px).
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

  // Enlace de la barra general; el de la sección actual queda en tono principal
  // con un subrayado ámbar fino (`aria-current="page"`), para saber dónde se está.
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLinkProps = (href: string) => ({
    href,
    "aria-current": isCurrent(href) ? ("page" as const) : undefined,
    className: `relative rounded-sm py-1 font-data text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-amber after:transition-transform after:duration-200 ${
      isCurrent(href)
        ? "text-paper after:scale-x-100"
        : "text-paper-muted after:scale-x-0 hover:text-paper"
    }`,
  });
  // Barra general: navegación de contenido que el sitio ofrece a cualquiera.
  // "Listas" es la superficie pública `/lists`, distinta de `/me/lists`.
  // "Caminos" es `/caminos` (descubrimiento, openspec: add-camino), distinta
  // de `/me/caminos` (gestión propia) — mismo criterio que "Listas".
  // "Actividad" es `/activity`, distinta del feed de seguidos en `/me/feed`.
  // Moderación y Administración viven en el menú de usuario (openspec: fix-header-overflow).
  const generalLinks = (
    <>
      {exploreEnabled ? (
        <Link {...navLinkProps("/explore")}>
          {tExplore("navLabel")}
        </Link>
      ) : null}
      <Link {...navLinkProps("/lists")}>
        {t("lists")}
      </Link>
      <Link {...navLinkProps("/caminos")}>
        {tCamino("railLabel")}
      </Link>
      <Link {...navLinkProps("/activity")}>
        {t("activity")}
      </Link>
    </>
  );

  return (
    // Fija arriba con fondo translúcido y desenfoque: la búsqueda y la
    // navegación quedan a mano al bajar por páginas largas (discografías, feed).
    <header className="sticky top-0 z-30 border-b border-ink-border bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <div className="hidden lg:block">
            <HeaderSearch />
          </div>
          {/* Barra general: solo navegación de contenido que ofrece el sitio a
              cualquiera. Las superficies personales viven en el menú de usuario. */}
          <nav aria-label={t("generalNav")} className="hidden items-center gap-5 lg:flex">
            {generalLinks}
            {currentUser ? <RegisterListenButton /> : null}
          </nav>
        </div>

        {/* Sesión e idioma van juntos al extremo derecho, separados de la navegación
            de contenido: no son "a dónde ir" sino "quién soy / preferencias de la
            app" — mismo patrón que Letterboxd, GitHub, etc. */}
        <div className="hidden items-center gap-4 lg:flex">
          <LocaleSwitcher t={t} currentLocale={currentLocale} onChange={handleLocaleChange} />
          {currentUser ? (
            <UserMenu
              username={currentUser.username}
              displayName={currentUser.displayName ?? currentUser.username}
              avatarUrl={currentUser.avatarUrl ?? null}
              pendingFollowRequests={pendingFollowRequests}
              permissions={platformPermissions}
              logoutPending={logoutPending}
              logoutError={logoutError}
              onLogout={handleLogout}
            />
          ) : (
            <AuthActions t={t} />
          )}
        </div>

        {/* Debajo de `lg`, la fila de arriba se reduce a logo + este botón: el
            buscador, la navegación y la zona de usuario se pliegan en el panel
            de abajo en vez de desbordar a 375px. */}
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper lg:hidden"
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
          // Desplazamiento propio: el header es fijo, así que un panel más alto que
          // la pantalla dejaría fuera de alcance las últimas opciones (cerrar sesión).
          className="themed-scrollbar flex max-h-[calc(100dvh-3.75rem)] flex-col gap-4 overflow-y-auto border-t border-ink-border bg-ink px-4 py-4 lg:hidden"
        >
          {/* Bloque 1 — barra general. */}
          <HeaderSearch fluid />
          <nav aria-label={t("generalNav")} className="flex flex-col items-start gap-3">
            {generalLinks}
            {currentUser ? <RegisterListenButton /> : null}
          </nav>

          {/* Bloque 2 — zona de usuario. */}
          <div className="flex flex-col gap-4 border-t border-ink-border pt-4">
            {currentUser ? (
              <>
                <Link
                  href={`/users/${encodeURIComponent(currentUser.username)}`}
                  className="flex items-center gap-2.5 rounded-md px-3 py-1 transition-colors hover:bg-ink-surface"
                >
                  <UserAvatar
                    avatarUrl={currentUser.avatarUrl ?? null}
                    username={currentUser.username}
                    name={currentUser.displayName ?? currentUser.username}
                    size="menu"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper">
                      {currentUser.displayName ?? currentUser.username}
                    </span>
                    <span className="block truncate font-data text-xs text-paper-muted">
                      @{currentUser.username}
                    </span>
                  </span>
                </Link>
                <UserMenuList
                  username={currentUser.username}
                  pendingFollowRequests={pendingFollowRequests}
                  surface="panel"
                  permissions={platformPermissions}
                  onNavigate={() => setMenuOpen(false)}
                  logoutPending={logoutPending}
                  logoutError={logoutError}
                  onLogout={handleLogout}
                />
              </>
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
    <nav
      aria-label={t("localeSwitcher")}
      className="inline-flex w-fit items-center gap-0.5 rounded-md border border-ink-border p-0.5"
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          className={`rounded px-1.5 py-0.5 font-data text-[11px] uppercase transition-colors ${
            locale === currentLocale
              ? "bg-ink-surface text-paper"
              : "text-paper-muted hover:text-paper"
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
        className="rounded-md px-3 py-2 text-paper transition-colors hover:bg-ink-surface"
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
