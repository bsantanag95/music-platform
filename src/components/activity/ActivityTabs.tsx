"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { CommunityActivitySection, type ActivitySource } from "./CommunityActivitySection";
import type { FeedResponse } from "@/lib/api/schemas";

interface ActivityTabDef {
  key: ActivitySource;
  label: string;
  initial: FeedResponse;
}

interface ActivityTabsProps {
  tabs: ActivityTabDef[];
  tablistLabel: string;
  emptyMessage: string;
}

// Pestañas de `/activity` para usuarios con sesión: Recientes, De la gente que
// seguís y Tu actividad. Apiladas como tres secciones la página se volvía
// demasiado vertical para llegar a la última — mismo patrón ARIA tabs que
// `PopularCommentsTabs` (estado local, flechas), pero cada panel es una
// `CommunityActivitySection` completa (con su propia paginación) en vez de una
// lista simple. Solo se monta la pestaña activa; el caché de React Query hace
// que volver a una pestaña ya visitada no vuelva a pedir la página 1.
export function ActivityTabs({ tabs, tablistLabel, emptyMessage }: ActivityTabsProps) {
  const baseId = useId();
  const [active, setActive] = useState<ActivitySource>(tabs[0]!.key);
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0]!;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = tabs.findIndex((tab) => tab.key === active);
    const next =
      event.key === "ArrowRight"
        ? tabs[(i + 1) % tabs.length]!
        : tabs[(i - 1 + tabs.length) % tabs.length]!;
    setActive(next.key);
    document.getElementById(`${baseId}-tab-${next.key}`)?.focus();
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        role="tablist"
        aria-label={tablistLabel}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 border-b border-ink-border pb-3"
      >
        {tabs.map((tab) => {
          const selected = tab.key === activeTab.key;
          return (
            <button
              key={tab.key}
              id={`${baseId}-tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                selected
                  ? "border-amber text-paper"
                  : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel-${activeTab.key}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${activeTab.key}`}
      >
        <CommunityActivitySection
          key={activeTab.key}
          source={activeTab.key}
          initial={activeTab.initial}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
