"use client";

import { useEffect, useRef, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";

// Barra de pestañas de la página de álbum (openspec: redesign-album-page). Cada pestaña es
// un segmento de ruta propio (D15), así que se puede enlazar y el botón "atrás" las
// recorre. Cliente porque el layout persiste entre pestañas: la activa sale del segmento
// seleccionado, no de un re-render del servidor.
// Fija bajo el encabezado del sitio y sin barra de desplazamiento; el borde con pestañas
// ocultas se desvanece solo cuando hay desborde (openspec: refine-album-page-phase1, D1 y D2).

export type AlbumTabKey = "songs" | "credits" | "editions" | "reviews";

const SEGMENT_BY_TAB: Record<AlbumTabKey, string | null> = {
  songs: null,
  credits: "credits",
  editions: "editions",
  reviews: "reviews",
};

interface AlbumTabsProps {
  releaseGroupId: string;
  /** Pestañas con contenido; Canciones y Reseñas siempre están. */
  available: { credits: boolean; editions: boolean };
  reviewCount: number;
}

/** Ancho del desvanecido (2rem): la pestaña activa se lleva a la vista fuera de él. */
const FADE_PX = 32;

/** Lleva la pestaña activa a la vista desplazando solo la barra, sin mover la página. */
function revealActive(nav: HTMLElement) {
  const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (!active) return;
  const navBox = nav.getBoundingClientRect();
  const box = active.getBoundingClientRect();
  if (box.right > navBox.right - FADE_PX) nav.scrollLeft += box.right - navBox.right + FADE_PX;
  else if (box.left < navBox.left + FADE_PX && nav.scrollLeft > 0) nav.scrollLeft -= navBox.left + FADE_PX - box.left;
}

/**
 * Bordes con contenido oculto, para desvanecerlos. Observa también la lista: crece cuando cargan las fuentes, sin que
 * cambie el ancho de la barra. Mientras la persona no desplace la barra a mano, la pestaña activa se mantiene a la vista.
 */
function useOverflowEdges(ref: React.RefObject<HTMLElement | null>, segment: string | null) {
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let userScrolled = false;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      setEdges({ start: element.scrollLeft > 1, end: max - element.scrollLeft > 1 });
    };
    const resize = () => {
      if (!userScrolled) revealActive(element);
      update();
    };
    const markUser = () => {
      userScrolled = true;
    };
    resize();
    element.addEventListener("scroll", update, { passive: true });
    element.addEventListener("pointerdown", markUser, { passive: true });
    element.addEventListener("wheel", markUser, { passive: true });
    element.addEventListener("touchstart", markUser, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      element.removeEventListener("pointerdown", markUser);
      element.removeEventListener("wheel", markUser);
      element.removeEventListener("touchstart", markUser);
      observer?.disconnect();
    };
  }, [ref, segment]);
  return edges;
}

const FADE = {
  both: "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]",
  start: "[mask-image:linear-gradient(to_right,transparent,black_2rem)]",
  end: "[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]",
};

export function AlbumTabs({ releaseGroupId, available, reviewCount }: AlbumTabsProps) {
  const t = useTranslations("catalog.album.tabs");
  const segment = useSelectedLayoutSegment();
  const navRef = useRef<HTMLElement>(null);
  const edges = useOverflowEdges(navRef, segment);
  const tabs: AlbumTabKey[] = [
    "songs",
    ...(available.credits ? (["credits"] as const) : []),
    ...(available.editions ? (["editions"] as const) : []),
    "reviews",
  ];

  const fade = edges.start && edges.end ? FADE.both : edges.start ? FADE.start : edges.end ? FADE.end : "";

  return (
    <nav
      ref={navRef}
      aria-label={t("label")}
      data-fade-start={edges.start || undefined}
      data-fade-end={edges.end || undefined}
      className={`sticky top-[var(--site-header-h)] z-20 -mx-4 h-[var(--album-tabs-h)] overflow-x-auto bg-ink px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden ${fade}`}
    >
      <ul className="flex h-full min-w-max items-end gap-1 border-b border-ink-border">
        {tabs.map((tab) => {
          const tabSegment = SEGMENT_BY_TAB[tab];
          const active = segment === tabSegment || (tab === "songs" && segment === "__PAGE__");
          const base = albumHref(null, "", releaseGroupId);
          const href = tabSegment ? `${base}/${tabSegment}` : base;
          return (
            <li key={tab}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex items-baseline gap-1.5 border-b-2 px-3 py-2 font-display text-sm transition-colors ${
                  active
                    ? "border-amber text-paper"
                    : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {t(tab)}
                {tab === "reviews" && <> <span className="font-data text-xs text-paper-muted">{reviewCount}</span></>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
