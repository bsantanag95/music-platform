"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export type ListsTab = "mine" | "saved" | "discover";
export const LISTS_TABS: ListsTab[] = ["mine", "saved", "discover"];

export function parseListsTab(value: string | string[] | undefined): ListsTab {
  return LISTS_TABS.includes(value as ListsTab) ? (value as ListsTab) : "mine";
}

// Sub-navegación de /me/lists. La pestaña activa vive en `?tab=` para ser
// enlazable y sobrevivir a la recarga; cada cambio de pestaña es una navegación
// (el panel se resuelve en el servidor). Semántica de tablist con flechas
// (mismo patrón que PopularCommentsTabs), pero con `<Link>` en vez de estado
// local porque la fuente de verdad es la URL.
export function ListsSection({
  activeTab,
  children,
}: {
  activeTab: ListsTab;
  children: ReactNode;
}) {
  const t = useTranslations("lists");
  const pathname = usePathname();

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = LISTS_TABS.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % LISTS_TABS.length
        : (i - 1 + LISTS_TABS.length) % LISTS_TABS.length;
    const next = LISTS_TABS[nextIndex]!;
    document.getElementById(`lists-tab-${next}`)?.focus();
    document.getElementById(`lists-tab-${next}`)?.click();
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <div
        role="tablist"
        aria-label={t("tablistLabel")}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 border-b border-ink-border pb-3"
      >
        {LISTS_TABS.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Link
              key={tab}
              id={`lists-tab-${tab}`}
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

      <div role="tabpanel" aria-labelledby={`lists-tab-${activeTab}`}>
        {children}
      </div>
    </div>
  );
}
