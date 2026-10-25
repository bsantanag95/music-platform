"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type CollectionTab = "own" | "wanted";

type ReportTotal = (tab: CollectionTab, total: number) => void;
type AdjustTotal = (tab: CollectionTab, delta: number) => void;

// Fuera de las pestañas (la colección del perfil) nadie escucha: informar no hace nada.
const CollectionTotalsContext = createContext<{ report: ReportTotal; adjust: AdjustTotal }>({
  report: () => {},
  adjust: () => {},
});

/**
 * El estante de la pestaña abierta informa su total (sin filtros) cada vez que llega una página nueva: tras quitar,
 * deshacer o agregar desde el diálogo, la cifra de la pestaña lo sigue sin recargar.
 */
export function useReportCollectionTotal(tab: CollectionTab, total: number | undefined) {
  const { report } = useContext(CollectionTotalsContext);
  useEffect(() => {
    if (total !== undefined) report(tab, total);
  }, [report, tab, total]);
}

/**
 * Mueve la cifra de la otra pestaña, que no tiene estante montado: "Lo conseguí" suma una copia a Tengo desde Busco
 * (y su deshacer la resta).
 */
export function useAdjustCollectionTotal(): AdjustTotal {
  return useContext(CollectionTotalsContext).adjust;
}

// Pestañas Tengo / Busco con su total (openspec: redesign-collection-header-toolbar, D2). Son enlaces (`?tab=wanted`)
// como antes; las cifras iniciales llegan del servidor y la de la pestaña abierta la actualiza su estante.
export function CollectionTabs({
  active,
  initialTotals,
  children,
}: {
  active: CollectionTab;
  initialTotals: Record<CollectionTab, number>;
  children: ReactNode;
}) {
  const t = useTranslations("collection");
  const [totals, setTotals] = useState(initialTotals);
  const report = useCallback<ReportTotal>(
    (tab, total) => setTotals((current) => (current[tab] === total ? current : { ...current, [tab]: total })),
    [],
  );
  const adjust = useCallback<AdjustTotal>(
    (tab, delta) => setTotals((current) => ({ ...current, [tab]: Math.max(0, current[tab] + delta) })),
    [],
  );
  const value = useMemo(() => ({ report, adjust }), [report, adjust]);

  const tabs: { key: CollectionTab; href: string; label: string }[] = [
    { key: "own", href: "/me/collection", label: t("tabHave") },
    { key: "wanted", href: "/me/collection?tab=wanted", label: t("tabWant") },
  ];

  return (
    <CollectionTotalsContext.Provider value={value}>
      <div role="tablist" aria-label={t("title")} className="flex gap-7 border-b border-ink-border">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={selected}
              className={`-mb-px inline-flex items-baseline gap-2 border-b-2 py-2.5 font-display text-base transition-colors [@media(pointer:coarse)]:min-h-11 ${
                selected
                  ? "border-amber text-paper"
                  : "border-transparent text-paper-muted hover:text-paper"
              }`}
            >
              {tab.label}{" "}
              <span className={`font-data text-xs tabular-nums ${selected ? "text-amber" : ""}`}>
                {totals[tab.key]}
              </span>
            </Link>
          );
        })}
      </div>
      {children}
    </CollectionTotalsContext.Provider>
  );
}
