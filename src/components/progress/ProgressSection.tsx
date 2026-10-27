"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { DEFAULT_PROGRESS_TAB, PROGRESS_TABS, type ProgressTab } from "./progress-tabs";

// Sub-navegación de /me/progress, calcada de `ListsSection` — mismo problema
// (contenido propio vs. ajeno) resuelto en `/me/lists` con "Mis listas ·
// Guardadas · Descubrir": pestañas en vez de una lista unificada. La pestaña activa vive en `?tab=`
// para ser enlazable y sobrevivir a la recarga; cada cambio de pestaña es una
// navegación (el panel se resuelve en el servidor) y vuelve a los filtros por defecto. En un teléfono las tres
// pestañas caben en una fila (openspec: refine-progress-page-phase1, D7).
export function ProgressSection({
  activeTab,
  children,
}: {
  activeTab: ProgressTab;
  children: ReactNode;
}) {
  const t = useTranslations("camino");
  const pathname = usePathname();

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = PROGRESS_TABS.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % PROGRESS_TABS.length
        : (i - 1 + PROGRESS_TABS.length) % PROGRESS_TABS.length;
    const next = PROGRESS_TABS[nextIndex]!;
    document.getElementById(`progress-tab-${next}`)?.focus();
    document.getElementById(`progress-tab-${next}`)?.click();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        role="tablist"
        aria-label={t("tablistLabel")}
        onKeyDown={onKeyDown}
        className="-mx-1 flex gap-1.5 overflow-x-auto border-b border-ink-border px-1 pb-3 [scrollbar-width:none] sm:gap-2"
      >
        {PROGRESS_TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Link
              key={tab}
              id={`progress-tab-${tab}`}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              href={{ pathname, query: tab === DEFAULT_PROGRESS_TAB ? {} : { tab } }}
              className={`shrink-0 whitespace-nowrap rounded border px-2.5 py-1.5 font-data text-xs transition-colors sm:px-3 ${
                selected
                  ? "border-amber text-paper"
                  : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {t(`tabs.${tab}`)}
            </Link>
          );
        })}
      </div>

      <div role="tabpanel" aria-labelledby={`progress-tab-${activeTab}`}>
        {children}
      </div>
    </div>
  );
}
