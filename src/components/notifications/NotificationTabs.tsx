"use client";

import { type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import type { NotificationTabValue } from "@/lib/api/schemas";

const TABS: readonly NotificationTabValue[] = ["for_you", "releases"];

interface NotificationTabsProps {
  active: NotificationTabValue;
  /** Punto ámbar sin cifra en "Novedades" (D8). */
  newReleases: boolean;
  onChange: (tab: NotificationTabValue) => void;
  /** Etiqueta del `tablist`. */
  label: string;
  /** Prefijo de los ids de pestaña y panel (`aria-controls` / `aria-labelledby`). */
  panelId: string;
}

/**
 * Pestañas de la bandeja (openspec: add-notification-milestones-and-releases,
 * D8): "Para ti" y "Novedades". Mismo patrón ARIA que `ActivityTabs` (flechas
 * para moverse, `tabIndex` solo en la activa). El punto de "Novedades" no
 * lleva cifra: la campana no convierte las novedades en un contador.
 */
export function NotificationTabs({
  active,
  newReleases,
  onChange,
  label,
  panelId,
}: NotificationTabsProps) {
  const t = useTranslations("notifications");

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = TABS.indexOf(active);
    const next =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]!
        : TABS[(index - 1 + TABS.length) % TABS.length]!;
    onChange(next);
    document.getElementById(`${panelId}-tab-${next}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex gap-5 border-b border-ink-border"
    >
      {TABS.map((tab) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            id={`${panelId}-tab-${tab}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${panelId}-panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2 pt-1 font-data text-xs transition-colors ${
              selected
                ? "border-amber text-paper"
                : "border-transparent text-paper-muted hover:text-paper"
            }`}
          >
            {t(`tabs.${tab}`)}
            {tab === "releases" && newReleases ? (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
                <span className="sr-only">{t("tabs.newReleasesUnseen")}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
