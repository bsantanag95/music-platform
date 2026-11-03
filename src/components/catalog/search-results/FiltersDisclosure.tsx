"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Filtros de la búsqueda rápida (openspec: refine-search-results-phase2, design D2). En escritorio se ven siempre; en
// móvil, categoría y década juntas eran 13 pastillas en 5 líneas antes del primer resultado, así que se pliegan tras un
// botón "Filtros" que dice cuántos hay activos. Las pastillas siguen siendo enlaces renderizados en el servidor.
export function FiltersDisclosure({ active, children }: { active: number; children: ReactNode }) {
  const t = useTranslations("catalog.search.results.filters");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 font-data text-xs transition-colors sm:hidden ${
          active > 0 ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
        }`}
      >
        <span aria-hidden>{open ? "▴" : "▾"}</span>
        {active > 0 ? t("toggleActive", { count: active }) : t("toggle")}
      </button>
      <div id={panelId} className={`${open ? "flex" : "hidden"} flex-col gap-3 sm:flex`}>
        {children}
      </div>
    </div>
  );
}
