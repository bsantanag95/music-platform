"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { SettingsScreen, SettingsScreenId } from "./settings-screens";

interface SettingsNavProps {
  screens: readonly SettingsScreen[];
  /** Contador por pantalla (bandeja de solicitudes en Red); solo se muestra si es > 0. */
  badges?: Partial<Record<SettingsScreenId, number>>;
}

// Menú lateral del área de ajustes: pestañas horizontales con scroll por debajo
// de `md` y columna fija desde `md`. Es cliente solo para marcar la pantalla
// activa según la ruta.
export function SettingsNav({ screens, badges = {} }: SettingsNavProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("settings.nav.label")}
      className="flex gap-1 overflow-x-auto pb-1 md:sticky md:top-8 md:flex-col md:self-start md:overflow-visible md:pb-0"
    >
      {screens.map((screen) => {
        const active = pathname === screen.href || pathname.startsWith(`${screen.href}/`);
        const badge = badges[screen.id] ?? 0;
        return (
          <Link
            key={screen.id}
            href={screen.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-md border-b-2 px-3 py-2 font-display text-sm transition-colors md:border-b-0 md:border-l-2 md:rounded-l-none ${
              active
                ? "border-amber bg-ink-surface text-paper"
                : "border-transparent text-paper-muted hover:bg-ink-surface hover:text-paper"
            }`}
          >
            <span className="whitespace-nowrap">{t(`settings.nav.${screen.id}`)}</span>
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
