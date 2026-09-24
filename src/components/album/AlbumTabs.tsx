"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Barra de pestañas de la página de álbum (openspec: redesign-album-page). Cada pestaña es
// un segmento de ruta propio (D15), así que se puede enlazar y el botón "atrás" las
// recorre. Cliente porque el layout persiste entre pestañas: la activa sale del segmento
// seleccionado, no de un re-render del servidor.

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

export function AlbumTabs({ releaseGroupId, available, reviewCount }: AlbumTabsProps) {
  const t = useTranslations("catalog.album.tabs");
  const segment = useSelectedLayoutSegment();
  const tabs: AlbumTabKey[] = [
    "songs",
    ...(available.credits ? (["credits"] as const) : []),
    ...(available.editions ? (["editions"] as const) : []),
    "reviews",
  ];

  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-ink-border">
        {tabs.map((tab) => {
          const tabSegment = SEGMENT_BY_TAB[tab];
          const active = segment === tabSegment || (tab === "songs" && segment === "__PAGE__");
          const href = tabSegment ? `/album/${releaseGroupId}/${tabSegment}` : `/album/${releaseGroupId}`;
          return (
            <li key={tab}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex border-b-2 px-3 py-2 font-display text-sm transition-colors ${
                  active
                    ? "border-amber text-paper"
                    : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {tab === "reviews" ? t("reviewsCount", { count: reviewCount }) : t(tab)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
