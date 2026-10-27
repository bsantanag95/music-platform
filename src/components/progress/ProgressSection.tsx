"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";
import {
  DEFAULT_PROGRESS_TAB,
  PROGRESS_TABS,
  type ProgressTab,
} from "./progress-tabs";

interface ProgressSectionContextValue {
  /** La pestaña activa informa su total real cuando borra o deja de seguir (D3). */
  reportTotal: (tab: ProgressTab, total: number) => void;
  /** Abre la acción principal de la pestaña (los estados vacíos la usan). */
  openPrimary: () => void;
}

export const ProgressSectionContext =
  createContext<ProgressSectionContextValue>({
    reportTotal: () => {},
    openPrimary: () => {},
  });

export function useProgressSection() {
  return useContext(ProgressSectionContext);
}

// Acción del diálogo de acciones rápidas que abre el botón principal de cada pestaña; Listas que sigo no crea nada.
const PRIMARY_ACTION = {
  discographies: "journey",
  lists: "newCamino",
} as const;

// Sección /me/progress (openspec: redesign-progress-toolbar), calcada de `ListsSection`: cabecera con la acción
// principal de la pestaña —el diálogo de acciones rápidas del Header ya en "Completar discografía" o "Nueva lista para
// completar" (D1)—, pestañas con su total (D3) y, en Listas que sigo, un enlace al descubrimiento. La pestaña activa
// vive en `?tab=`; cada cambio de pestaña es una navegación (el panel se resuelve en el servidor) y vuelve a los filtros
// por defecto. Bajo `sm` "Listas para completar" se abrevia para que las tres pestañas quepan en una fila (D4).
export function ProgressSection({
  activeTab,
  initialTotals,
  children,
}: {
  activeTab: ProgressTab;
  /** Totales de las tres pestañas contados en el servidor; luego la activa los actualiza. */
  initialTotals: Record<ProgressTab, number>;
  children: ReactNode;
}) {
  const t = useTranslations("camino");
  const pathname = usePathname();
  const [totals, setTotals] = useState(initialTotals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const reportTotal = useCallback(
    (tab: ProgressTab, total: number) =>
      setTotals((current) =>
        current[tab] === total ? current : { ...current, [tab]: total },
      ),
    [],
  );
  const context = useMemo(
    () => ({ reportTotal, openPrimary: () => setDialogOpen(true) }),
    [reportTotal],
  );
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    triggerRef.current?.focus();
  }, []);

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

  const primaryAction =
    activeTab === "following" ? null : PRIMARY_ACTION[activeTab];

  return (
    <ProgressSectionContext.Provider value={context}>
      <div className="flex w-full flex-col gap-5">
        {/* La acción va en la fila del título: en un teléfono así no ocupa una fila propia. */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-2xl text-paper">
              {t("hub.title")}
            </h1>
            {primaryAction ? (
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-amber bg-amber px-3.5 font-display text-sm text-ink transition-colors hover:bg-amber-hover [@media(pointer:coarse)]:min-h-11"
              >
                <span aria-hidden>+</span>
                {activeTab === "lists" ? (
                  <>
                    <span className="sm:hidden">{t("primaryShort.lists")}</span>
                    <span className="hidden sm:inline">
                      {t("primary.lists")}
                    </span>
                  </>
                ) : (
                  t(`primary.${activeTab}`)
                )}
              </button>
            ) : (
              <Link
                href="/caminos"
                className="inline-flex min-h-9 shrink-0 items-center font-data text-xs text-paper-muted transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
              >
                {t("discoverLists")}
                <span aria-hidden>&nbsp;→</span>
              </Link>
            )}
          </div>
          <p className="font-body text-sm text-paper-muted">
            {t("hub.description")}
          </p>
        </header>

        <div
          role="tablist"
          aria-label={t("tablistLabel")}
          onKeyDown={onKeyDown}
          className="flex gap-3 overflow-x-auto border-b border-ink-border [scrollbar-width:none] sm:gap-6"
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
                href={{
                  pathname,
                  query: tab === DEFAULT_PROGRESS_TAB ? {} : { tab },
                }}
                className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 font-display text-[0.8125rem] transition-colors sm:gap-1.5 sm:text-sm ${
                  selected
                    ? "border-amber text-paper"
                    : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {tab === "lists" ? (
                  <>
                    <span className="sm:hidden">{t("tabsShort.lists")}</span>
                    <span className="hidden sm:inline">{t("tabs.lists")}</span>
                  </>
                ) : (
                  t(`tabs.${tab}`)
                )}
                <span className="font-data text-xs text-paper-muted">
                  {totals[tab]}
                </span>
              </Link>
            );
          })}
        </div>

        <div role="tabpanel" aria-labelledby={`progress-tab-${activeTab}`}>
          {children}
        </div>
      </div>
      {dialogOpen && primaryAction ? (
        <QuickActionsDialog
          onClose={closeDialog}
          initialAction={primaryAction}
        />
      ) : null}
    </ProgressSectionContext.Provider>
  );
}
