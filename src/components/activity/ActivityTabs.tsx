"use client";

import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CommunityActivitySection, activityQueryOptions, type ActivityEmpty } from "./CommunityActivitySection";
import { TAB_PARAM, tabFromParam, type ActivitySource } from "./activity-tab-param";
import type { FeedResponse } from "@/lib/api/schemas";

interface ActivityTabDef {
  key: ActivitySource;
  label: string;
  // Solo la pestaña que llegó en la URL trae su primera página del servidor.
  initial?: FeedResponse;
  empty: ActivityEmpty;
}

interface ActivityTabsProps {
  tabs: ActivityTabDef[];
  tablistLabel: string;
}

// Pestañas de `/activity` para usuarios con sesión: Recientes, Siguiendo y Tú. Apiladas como tres secciones la página
// se volvía demasiado vertical para llegar a la última — mismo patrón ARIA tabs que `PopularCommentsTabs` (flechas),
// pero cada panel es una `CommunityActivitySection` completa (con su propia paginación) en vez de una lista simple.
// La pestaña vive en `?tab=` (redesign-activity-page, D2): se deriva siempre de `useSearchParams` y se escribe con
// `history.replaceState`, que Next sincroniza sin volver a renderizar el server component ni apilar historial. Solo
// se monta la pestaña activa; el caché de React Query hace que volver a una pestaña ya visitada no vuelva a pedir la
// página 1.
export function ActivityTabs({ tabs, tablistLabel }: ActivityTabsProps) {
  const baseId = useId();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const active = tabFromParam(searchParams.get("tab"));
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0]!;

  const select = (key: ActivitySource) => {
    const params = new URLSearchParams(searchParams.toString());
    const value = TAB_PARAM[key];
    if (value) params.set("tab", value);
    else params.delete("tab");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  // Calienta la primera página de una pestaña antes del click: al pasar el mouse o enfocarla con el teclado.
  const prefetch = (key: ActivitySource) => {
    if (key === activeTab.key) return;
    void queryClient.prefetchInfiniteQuery(activityQueryOptions(key));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = tabs.findIndex((tab) => tab.key === activeTab.key);
    const next =
      event.key === "ArrowRight"
        ? tabs[(i + 1) % tabs.length]!
        : tabs[(i - 1 + tabs.length) % tabs.length]!;
    select(next.key);
    document.getElementById(`${baseId}-tab-${next.key}`)?.focus();
  };

  const { ref: tablistRef, fadeEnd } = useOverflowFade<HTMLDivElement>();

  return (
    <div className="flex w-full flex-col gap-5">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={tablistLabel}
        onKeyDown={onKeyDown}
        // Desvanecido del borde derecho solo cuando la barra desborda y no se llegó al final: con las etiquetas cortas
        // las tres caben en 375px, pero una traducción futura más larga quedaría cortada sin ninguna pista.
        className={`flex w-full gap-6 overflow-x-auto overflow-y-hidden border-b border-ink-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          fadeEnd ? "[mask-image:linear-gradient(to_right,black_80%,transparent)]" : ""
        }`}
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
              onClick={() => select(tab.key)}
              onPointerEnter={() => prefetch(tab.key)}
              onFocus={() => prefetch(tab.key)}
              // Pestañas subrayadas, como la navegación del Header: se leen como secciones, no como los chips de
              // filtro. El hover cambia solo el color del texto — con un subrayado gris del mismo grosor, al pasar el
              // mouse parecía haber dos pestañas activas.
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1 font-data text-sm transition-colors ${
                selected ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
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
          empty={activeTab.empty}
        />
      </div>
    </div>
  );
}

// `true` mientras el contenedor desborda en horizontal y quedan elementos fuera a la derecha.
function useOverflowFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [fadeEnd, setFadeEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setFadeEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [update]);

  return { ref, fadeEnd };
}
