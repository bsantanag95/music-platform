"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CAMINOS_TABS, type CaminosTab } from "./caminos-tabs";

// Sub-navegación de /me/caminos, calcada de `ListsSection` — mismo problema
// (contenido propio vs. ajeno) resuelto en `/me/lists` con "Mis listas ·
// Guardadas · Descubrir" (decisión del usuario tras comparar mockups: dos
// pestañas en vez de una lista unificada). La pestaña activa vive en `?tab=`
// para ser enlazable y sobrevivir a la recarga; cada cambio de pestaña es una
// navegación (el panel se resuelve en el servidor).
export function CaminosSection({
  activeTab,
  children,
}: {
  activeTab: CaminosTab;
  children: ReactNode;
}) {
  const t = useTranslations("camino");
  const pathname = usePathname();

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = CAMINOS_TABS.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % CAMINOS_TABS.length
        : (i - 1 + CAMINOS_TABS.length) % CAMINOS_TABS.length;
    const next = CAMINOS_TABS[nextIndex]!;
    document.getElementById(`caminos-tab-${next}`)?.focus();
    document.getElementById(`caminos-tab-${next}`)?.click();
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div
        role="tablist"
        aria-label={t("tablistLabel")}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 border-b border-ink-border pb-3"
      >
        {CAMINOS_TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Link
              key={tab}
              id={`caminos-tab-${tab}`}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              href={{ pathname, query: tab === "mine" ? {} : { tab } }}
              className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
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

      <div role="tabpanel" aria-labelledby={`caminos-tab-${activeTab}`}>
        {children}
      </div>
    </div>
  );
}
