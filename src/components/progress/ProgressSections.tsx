"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type SectionState = "in_progress" | "complete" | "archived";

const SECTION_ORDER: SectionState[] = ["in_progress", "complete", "archived"];

// Secciones por estado de Discografías y Listas para completar (openspec: redesign-progress-views, D4): con el segmento
// "Todas" el listado se agrupa en En curso, Completas y Archivadas, cada grupo con el orden elegido. Archivadas empieza
// plegada: es lo que se dejó para después. Con un estado elegido en los segmentos no hay secciones.
export function ProgressSections<T extends { state: SectionState }>({
  items,
  grouped,
  render,
}: {
  items: T[];
  /** `false` con un estado elegido: el listado va sin encabezados. */
  grouped: boolean;
  render: (items: T[]) => ReactNode;
}) {
  const t = useTranslations("camino");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const archivedId = useId();

  if (!grouped) return <>{render(items)}</>;

  return (
    <div className="flex flex-col gap-5">
      {SECTION_ORDER.map((state) => {
        const group = items.filter((item) => item.state === state);
        if (group.length === 0) return null;
        const label = `${t(`section.${state}`)} · ${group.length}`;
        if (state === "archived") {
          return (
            <section key={state} aria-labelledby={`${archivedId}-label`} className="flex flex-col gap-2">
              <h2 id={`${archivedId}-label`} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-expanded={archivedOpen}
                  aria-controls={archivedId}
                  onClick={() => setArchivedOpen((open) => !open)}
                  className="inline-flex min-h-8 items-center gap-1.5 font-data text-[0.7rem] uppercase tracking-wider text-paper-muted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
                >
                  <span aria-hidden className={`transition-transform ${archivedOpen ? "rotate-90" : ""}`}>
                    ▸
                  </span>
                  {label}
                </button>
                <span aria-hidden className="h-px flex-1 bg-ink-border" />
              </h2>
              <div id={archivedId} hidden={!archivedOpen}>
                {archivedOpen ? render(group) : null}
              </div>
            </section>
          );
        }
        return (
          <section key={state} aria-label={t(`section.${state}`)} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 font-data text-[0.7rem] uppercase tracking-wider text-paper-muted">
              {label}
              <span aria-hidden className="h-px flex-1 bg-ink-border" />
            </h2>
            {render(group)}
          </section>
        );
      })}
    </div>
  );
}
