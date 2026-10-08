"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Permission } from "@/services/auth/authorization";
import { UserAvatar } from "@/components/social/UserAvatar";
import {
  buildUserMenuItems,
  USER_MENU_GROUP_ORDER,
  type ResolvedUserMenuItem,
  type UserMenuSurface,
} from "./user-menu-items";

interface LogoutControls {
  logoutPending: boolean;
  logoutError: string | null;
  onLogout: () => void;
}

interface UserMenuListProps extends LogoutControls {
  username: string;
  pendingFollowRequests: number;
  surface: UserMenuSurface;
  /** Permisos de plataforma: habilitan las herramientas de rol. */
  permissions?: readonly Permission[];
  /** `id` del contenedor, para `aria-controls` del disparador en escritorio. */
  id?: string;
  onNavigate?: () => void;
}

// Lista de destinos del usuario, agrupada con divisores. Compartida por el
// desplegable de escritorio y el panel móvil del Header — el contenido sale de
// `user-menu-items.ts`, única fuente junto con la pantalla Red de ajustes.
export function UserMenuList({
  username,
  pendingFollowRequests,
  surface,
  permissions = [],
  id,
  onNavigate,
  logoutPending,
  logoutError,
  onLogout,
}: UserMenuListProps) {
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const items = buildUserMenuItems({ username, pendingFollowRequests, surface, permissions });

  const groups = USER_MENU_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <nav id={id} className="flex flex-col gap-1" aria-label={t("userMenu")}>
      {groups.map(({ group, items: groupItems }, index) => (
        <div
          key={group}
          className={
            index > 0 ? "mt-1 flex flex-col gap-1 border-t border-ink-border pt-1" : "flex flex-col gap-1"
          }
        >
          {groupItems.map((item) => (
            <UserMenuLink key={item.id} item={item} label={t(item.labelKey)} onNavigate={onNavigate} />
          ))}
        </div>
      ))}

      <div className="mt-1 flex flex-col gap-1 border-t border-ink-border pt-1">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className="rounded px-3 py-2 text-left font-data text-xs text-paper-muted transition-colors hover:bg-ink hover:text-danger disabled:cursor-wait disabled:opacity-60"
        >
          {logoutPending ? t("logoutPending") : t("logout")}
        </button>
        {logoutError && (
          <span role="alert" className="px-3 font-data text-xs text-danger">
            {tErrors(`${logoutError}.description`)}
          </span>
        )}
      </div>
    </nav>
  );
}

function UserMenuLink({
  item,
  label,
  onNavigate,
}: {
  item: ResolvedUserMenuItem;
  label: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("common");

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 rounded px-3 py-2 font-data text-xs text-paper-muted transition-colors hover:bg-ink hover:text-paper"
    >
      <span className="truncate">{label}</span>
      {item.badgeCount != null && (
        <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 text-amber">
          {t("pendingFollowRequests", { count: item.badgeCount })}
        </span>
      )}
    </Link>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface UserMenuProps extends LogoutControls {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  pendingFollowRequests: number;
  permissions?: readonly Permission[];
}

// Menú de usuario de escritorio: disparador anclado al nombre visible que
// despliega `UserMenuList` **al pasar el cursor**. El clic sobre el disparador
// también alterna (soporte táctil y teclado). Cierra con Escape (devuelve foco),
// al salir el cursor, al navegar y al hacer clic fuera. Ver spec
// cross-view-navigation.
export function UserMenu({
  username,
  displayName,
  avatarUrl = null,
  pendingFollowRequests,
  permissions = [],
  logoutPending,
  logoutError,
  onLogout,
}: UserMenuProps) {
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  // Cierra al cambiar de ruta — cada Link del menú es un cambio de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 font-data text-xs text-paper transition-colors hover:bg-ink-surface ${
          open ? "bg-ink-surface" : ""
        }`}
      >
        {/* Avatar con un punto ámbar cuando hay solicitudes de seguimiento
            pendientes: antes solo se veían al abrir el menú. */}
        <span className="relative">
          <UserAvatar avatarUrl={avatarUrl} username={username} name={displayName} size="nav" />
          {pendingFollowRequests > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber ring-2 ring-ink">
              <span className="sr-only">{t("pendingFollowRequests", { count: pendingFollowRequests })}</span>
            </span>
          ) : null}
        </span>
        <span className="max-w-40 truncate">{displayName}</span>
        <ChevronDown open={open} />
      </button>
      {open && (
        // `pt-2` invisible entre el disparador y el panel: el cursor cruza ese
        // hueco sin salir del contenedor (el menú se abre al pasar el cursor).
        <div className="absolute right-0 top-full z-20 w-60 pt-2">
          <div className="themed-scrollbar max-h-[calc(100vh-5rem)] overflow-y-auto rounded-lg border border-ink-border bg-ink-surface p-1 shadow-xl shadow-black/50">
            <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-2">
              <UserAvatar avatarUrl={avatarUrl} username={username} name={displayName} size="menu" />
              <span className="min-w-0">
                <span className="block truncate font-display text-sm text-paper">{displayName}</span>
                <span className="block truncate font-data text-xs text-paper-muted">@{username}</span>
              </span>
            </div>
            <div className="border-t border-ink-border pt-1">
              <UserMenuList
                id={panelId}
                username={username}
                pendingFollowRequests={pendingFollowRequests}
                surface="header"
                permissions={permissions}
                onNavigate={() => setOpen(false)}
                logoutPending={logoutPending}
                logoutError={logoutError}
                onLogout={onLogout}
              />
            </div>
          </div>
        </div>
      )}
      {!open && logoutError && (
        <span
          role="alert"
          className="absolute right-0 z-20 mt-2 whitespace-nowrap font-data text-xs text-danger"
        >
          {tErrors(`${logoutError}.description`)}
        </span>
      )}
    </div>
  );
}
