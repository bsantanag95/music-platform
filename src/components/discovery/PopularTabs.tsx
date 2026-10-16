"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface PopularTabPanel {
  key: string;
  label: string;
  /** Qué ventana se usó para esta pestaña ("Lo que más mueve a la comunidad este mes."). */
  description: string;
  panel: ReactNode;
}

/**
 * Pestañas de "Popular ahora" (openspec: explore-popular-now). Los tres paneles llegan ya renderizados desde el servidor: cambiar
 * de pestaña no pide datos. La primera pestaña es la activa al cargar, así que sin JavaScript se ve la de álbumes. Patrón de
 * pestañas de WAI-ARIA: `tablist`, flechas izquierda/derecha, Inicio y Fin; solo la activa entra en el orden de tabulación.
 */
export function PopularTabs({ tabs, label }: { tabs: PopularTabPanel[]; label: string }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (tabs.length === 0) return null;

  const select = (index: number) => {
    setActive(index);
    refs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {tabs.length > 1 ? (
        <div role="tablist" aria-label={label} className="flex gap-1.5">
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.key}
                ref={(element) => {
                  refs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={onKeyDown}
                className={`rounded-full border px-3 py-1 font-data text-xs transition-colors focus-visible:border-amber ${
                  selected ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:border-amber hover:text-paper"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="font-body text-sm text-paper-muted">{tabs[active]!.description}</p>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          id={`${baseId}-panel-${tab.key}`}
          aria-labelledby={tabs.length > 1 ? `${baseId}-tab-${tab.key}` : undefined}
          hidden={index !== active}
          className="w-full"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
