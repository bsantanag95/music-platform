"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useSearchParams, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { AuthUser } from "@/lib/api/schemas";
import type { Permission } from "@/services/auth/authorization";
import { apiFetch, ApiError } from "@/lib/api/client";
import { isFocusRoute } from "@/lib/focus-routes";
import { LogoutResponseSchema } from "@/lib/api/schemas";
import { HeaderSearch } from "./HeaderSearch";
import { Logo } from "./Logo";
import { UserMenu, UserMenuList } from "./UserMenu";
import { QuickActionsButton } from "@/components/quick-actions/QuickActionsButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserAvatar } from "@/components/social/UserAvatar";

interface HeaderProps {
  user?: (Pick<AuthUser, "id" | "username" | "displayName"> & { avatarUrl?: string | null }) | null;
  exploreEnabled?: boolean;
  /** Entradas de la bandeja sin ver, calculadas en el servidor (campana). */
  notificationCount?: number;
  /** Punto de "Novedades" calculado en el servidor (pestaña del panel). */
  newReleases?: boolean;
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
  notificationCount = 0,
  newReleases = false,
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
  // Debajo de `lg` la barra general y la zona de usuario no entran en una fila:
  // se pliegan en este panel. Ver critique 2026-09-04, hallazgo P1, y
  // fix-header-overflow (con sesión la fila necesita ~835 px).
  const [menuOpen, setMenuOpen] = useState(false);
  // Debajo de `lg` la búsqueda no va dentro del menú: tiene su propio botón y se
  // abre en una fila bajo la barra (openspec: redesign-anon-home-phase1,
  // header-search). Menú y búsqueda son mutuamente excluyentes.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Cierra el panel mobile y la búsqueda al navegar — cada Link es un cambio de ruta.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Escape cierra la fila de búsqueda y devuelve el foco a su botón. Si el campo
  // ya usó el Escape para cerrar sus sugerencias (`preventDefault`), la fila sigue.
  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setSearchOpen(false);
      searchToggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const toggleSearch = () => {
    setMenuOpen(false);
    setSearchOpen((open) => !open);
  };

  const toggleMenu = () => {
    setSearchOpen(false);
    setMenuOpen((open) => !open);
  };

  const closeSearchAfterNavigate = () => {
    setSearchOpen(false);
  };

  // Atajo `/` (redesign-site-header): lleva al buscador del Header —en escritorio enfoca el
  // campo; debajo de `lg` abre la fila de búsqueda, que se enfoca sola—. No actúa mientras se
  // escribe en otro campo, con modificadores ni con un diálogo modal abierto.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const desktopField = document.querySelector<HTMLInputElement>("#header-desktop-search input");
      // `offsetParent` es null cuando el contenedor está oculto (debajo de `lg`).
      if (desktopField && desktopField.offsetParent !== null) {
        event.preventDefault();
        desktopField.focus();
        return;
      }
      event.preventDefault();
      setMenuOpen(false);
      setSearchOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  // Enlace de la barra general, en la tipografía de interfaz (redesign-site-header;
  // antes iba en monoespaciada): fondo suave al pasar el cursor y, en la sección
  // actual, tono principal con un subrayado ámbar fino (`aria-current="page"`).
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLinkProps = (href: string) => ({
    href,
    "aria-current": isCurrent(href) ? ("page" as const) : undefined,
    className: `relative rounded-md px-3 py-2 font-display text-[15px] transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:bg-amber after:transition-transform after:duration-200 hover:bg-ink-surface ${
      isCurrent(href)
        ? "text-paper after:scale-x-100"
        : "text-paper-muted after:scale-x-0 hover:text-paper"
    }`,
  });
  // Barra general: navegación de contenido que el sitio ofrece a cualquiera.
  // "Listas" es la superficie pública `/lists`, distinta de `/me/lists`.
  // "Comunidad" es `/activity`, distinta del feed de seguidos ("Actividad", `/me/feed`).
  // El descubrimiento de Caminos (`/caminos`) se alcanza desde `/lists`, no desde la barra.
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
      <Link {...navLinkProps("/activity")}>
        {t("community")}
      </Link>
    </>
  );

  // Pantalla de foco (onboarding): sin buscador, navegación ni menú de usuario; solo el logo (la
  // salida a Inicio) y el idioma. Va después de todos los hooks para respetar su orden.
  if (isFocusRoute(pathname)) {
    return (
      <header className="border-b border-ink-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Logo withName />
          <LocaleSwitcher t={t} currentLocale={currentLocale} onChange={handleLocaleChange} />
        </div>
      </header>
    );
  }

  return (
    // Fija arriba con fondo translúcido y desenfoque: la búsqueda y la
    // navegación quedan a mano al bajar por páginas largas (discografías, feed).
    <header className="sticky top-0 z-30 border-b border-ink-border bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70">
      {/* Escritorio en tres zonas (redesign-site-header, dirección «C · Disquería»): marca y
          navegación | buscador fluido al centro | cuenta. Debajo de `lg` vuelve a ser una fila
          flexible con los botones de búsqueda y menú. */}
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 lg:grid lg:grid-cols-[auto_minmax(12rem,1fr)_auto] lg:gap-6 xl:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:gap-5">
          <Logo withName />
          {/* Barra general: solo navegación de contenido que ofrece el sitio a
              cualquiera. Las superficies personales viven en el menú de usuario. */}
          <nav aria-label={t("generalNav")} className="hidden items-center gap-0.5 lg:flex">
            {generalLinks}
          </nav>
        </div>

        <div id="header-desktop-search" className="hidden w-full max-w-[30rem] justify-self-center lg:block">
          <HeaderSearch wide />
        </div>

        {/* Sesión e idioma van juntos al extremo derecho, separados de la navegación
            de contenido: no son "a dónde ir" sino "quién soy / preferencias de la
            app" — mismo patrón que Letterboxd, GitHub, etc. */}
        <div className="hidden items-center justify-end gap-3 lg:flex">
          <LocaleSwitcher t={t} currentLocale={currentLocale} onChange={handleLocaleChange} />
          {currentUser ? (
            <>
              {/* El "+" escribe; la campana avisa; el menú ve y gestiona. */}
              <QuickActionsButton />
              <NotificationBell
                initialCount={notificationCount}
                initialNewReleases={newReleases}
              />
              <UserMenu
                username={currentUser.username}
                displayName={currentUser.displayName ?? currentUser.username}
                avatarUrl={currentUser.avatarUrl ?? null}
                permissions={platformPermissions}
                logoutPending={logoutPending}
                logoutError={logoutError}
                onLogout={handleLogout}
              />
            </>
          ) : (
            <AuthActions t={t} />
          )}
        </div>

        {/* Debajo de `lg`, la fila de arriba se reduce a logo + búsqueda + campana
            + menú: la navegación y la zona de usuario se pliegan en el panel de
            abajo en vez de desbordar a 375px; la búsqueda se abre en su propia
            fila. La campana móvil es un enlace a la página (D8), no un panel
            flotante. */}
        <div className="flex items-center gap-1 lg:hidden">
          <button
            ref={searchToggleRef}
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper"
            aria-expanded={searchOpen}
            aria-controls="header-mobile-search"
            aria-label={searchOpen ? t("closeSearch") : t("openSearch")}
            onClick={toggleSearch}
          >
            <SearchIcon open={searchOpen} />
          </button>
          {currentUser ? (
            <NotificationBell
              variant="mobile"
              initialCount={notificationCount}
              initialNewReleases={newReleases}
            />
          ) : null}
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper"
            aria-expanded={menuOpen}
            aria-controls="header-mobile-menu"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            onClick={toggleMenu}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div id="header-mobile-search" className="border-t border-ink-border bg-ink px-4 py-3 lg:hidden">
          <HeaderSearch fluid autoFocus onNavigate={closeSearchAfterNavigate} />
        </div>
      ) : null}

      {menuOpen ? (
        <div
          id="header-mobile-menu"
          // Desplazamiento propio: el header es fijo, así que un panel más alto que
          // la pantalla dejaría fuera de alcance las últimas opciones (cerrar sesión).
          className="themed-scrollbar flex max-h-[calc(100dvh-3.75rem)] flex-col gap-4 overflow-y-auto border-t border-ink-border bg-ink px-4 py-4 lg:hidden"
        >
          {/* Bloque 1 — barra general (la búsqueda tiene su propio botón y fila). */}
          <nav aria-label={t("generalNav")} className="-mx-3 flex flex-col items-start gap-0.5">
            {generalLinks}
          </nav>

          {/* Bloque 2 — zona de usuario. */}
          <div className="flex flex-col gap-4 border-t border-ink-border pt-4">
            {currentUser ? (
              <>
                {/* Cabeza del bloque de usuario (openspec: add-header-quick-actions, D10). */}
                <div>
                  <QuickActionsButton />
                </div>
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
          className={`rounded px-2 py-1 font-data text-xs uppercase transition-colors ${
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

// Cuenta sin sesión (redesign-site-header): «Iniciar sesión» discreta y «Crear cuenta»
// principal, con el mismo texto que la acción de registro del hero de Inicio.
function AuthActions({ t }: { t: HeaderT }) {
  return (
    <div className="flex items-center gap-1.5 font-display text-sm">
      <Link
        href="/auth/login"
        className="inline-flex h-10 items-center rounded-md px-3.5 text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper"
      >
        {t("login")}
      </Link>
      <Link
        href="/auth/register"
        className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-medium text-ink transition-colors hover:bg-amber-hover"
      >
        {t("createAccount")}
      </Link>
    </div>
  );
}

function SearchIcon({ open }: { open: boolean }) {
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
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.5" y2="16.5" />
        </>
      )}
    </svg>
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
