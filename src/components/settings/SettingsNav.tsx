"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { SettingsScreen, SettingsScreenId } from "./settings-screens";

interface SettingsNavProps {
  screens: readonly SettingsScreen[];
  /** Contador por pantalla (bandeja de solicitudes en Red); solo se muestra si es > 0. */
  badges?: Partial<Record<SettingsScreenId, number>>;
  /** Una línea de estado bajo el nombre, solo desde `md` (openspec: polish-settings-overview, D2). */
  statuses?: Partial<Record<SettingsScreenId, { text: string; tone: "muted" | "warn" }>>;
}

// Menú lateral del área de ajustes: pestañas horizontales con scroll por debajo
// de `md` y columna fija desde `md`. Es cliente solo para marcar la pantalla
// activa según la ruta.
export function SettingsNav({ screens, badges = {}, statuses = {} }: SettingsNavProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Por debajo de `md` el menú es una fila con scroll: la pantalla activa se lleva a la vista al entrar y al cambiar de
  // pantalla (openspec: refine-settings-phase1, D5). Desde `md` es una columna y no hay nada que desplazar.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && navRef.current && navRef.current.scrollWidth > navRef.current.clientWidth) {
      active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label={t("settings.nav.label")}
      className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] md:sticky md:top-20 md:flex-col md:self-start md:overflow-visible md:pb-0"
    >
      {screens.map((screen) => {
        const active = pathname === screen.href || pathname.startsWith(`${screen.href}/`);
        const badge = badges[screen.id] ?? 0;
        const status = statuses[screen.id];
        return (
          <Link
            key={screen.id}
            href={screen.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-md border-b-2 px-3 py-2 font-display text-sm transition-colors [@media(pointer:coarse)]:min-h-11 md:border-b-0 md:border-l-2 md:rounded-l-none ${
              active
                ? "border-amber bg-ink-surface text-paper"
                : "border-transparent text-paper-muted hover:bg-ink-surface hover:text-paper"
            }`}
          >
            <span className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap">{t(`settings.nav.${screen.id}`)}</span>
              {status ? (
                <span
                  className={`hidden font-data text-[11px] leading-tight md:block ${
                    status.tone === "warn" ? "text-amber" : "text-paper-muted"
                  }`}
                >
                  {status.text}
                </span>
              ) : null}
            </span>
            {badge > 0 && (
              <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 font-data text-xs text-amber">
                {tCommon("pendingFollowRequests", { count: badge })}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
