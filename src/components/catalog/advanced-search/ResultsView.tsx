"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Vista Lista / Tabla de los resultados de la búsqueda avanzada (openspec: refine-advanced-search-phase3), al estilo de
// Metal Archives. Lista por defecto; la elección se recuerda en el navegador (una conveniencia: si el almacenamiento no
// está disponible, siempre Lista). La tabla es solo para pantallas anchas: en móvil se ve la lista aunque se haya
// elegido Tabla. El servidor prerenderiza las dos formas de la primera página (`ResultsViewSwitch`) y "Cargar más"
// lee la vista con `useResultsView`.

export type ResultsView = "list" | "table";

const STORAGE_KEY = "mp:advanced-results-view";

interface ViewState {
  view: ResultsView;
  setView: (view: ResultsView) => void;
}

const ViewContext = createContext<ViewState | null>(null);

function readView(): ResultsView {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "table" ? "table" : "list";
  } catch {
    return "list";
  }
}

export function ResultsViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ResultsView>("list");

  useEffect(() => setViewState(readView()), []);

  const setView = (next: ResultsView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: la vista vale solo para esta página.
    }
  };

  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

/** La vista elegida; fuera del proveedor (búsqueda rápida, tests), Lista. */
export function useResultsView(): ResultsView {
  return useContext(ViewContext)?.view ?? "list";
}

/** Lista o tabla; con Tabla, la lista sigue en móvil y la tabla toma su lugar desde `md`. */
export function ResultsViewSwitch({ list, table }: { list: ReactNode; table: ReactNode }) {
  if (useResultsView() === "list") return <>{list}</>;
  return (
    <>
      <div className="md:hidden">{list}</div>
      <div className="hidden md:block">{table}</div>
    </>
  );
}

/** Botones Lista / Tabla, solo en pantallas anchas. */
export function ResultsViewToggle() {
  const t = useTranslations("catalog.search.advanced.view");
  const state = useContext(ViewContext);
  if (!state) return null;
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="hidden overflow-hidden rounded border border-ink-border font-display text-xs md:inline-flex"
    >
      {(["list", "table"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={state.view === option}
          onClick={() => state.setView(option)}
          className={`px-2.5 py-1 transition-colors ${
            state.view === option ? "bg-ink-surface text-paper" : "text-paper-muted hover:text-paper"
          }`}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}
