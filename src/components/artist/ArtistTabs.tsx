"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Barra de pestañas de la página de artista (openspec: redesign-artist-page, capability
// `artist-page-layout`). Cada pestaña es un segmento de ruta propio: se puede enlazar y el
// botón "atrás" las recorre. Biografía solo existe si el artista tiene resumen. La alineación
// (openspec: add-artist-members-tab) se llama Integrantes en un grupo y Bandas en una persona, y
// solo existe si hay algo que listar.

type ArtistTabKey = "discography" | "members" | "bands" | "biography";

interface ArtistTabsProps {
  artistId: string;
  hasBiography: boolean;
  /** Pestaña de la alineación con su nombre, o `null` si no hay nada que listar. */
  lineupTab: "members" | "bands" | null;
}

const SEGMENTS: Record<ArtistTabKey, string | null> = {
  discography: null,
  members: "members",
  bands: "members",
  biography: "biography",
};

export function ArtistTabs({ artistId, hasBiography, lineupTab }: ArtistTabsProps) {
  const t = useTranslations("catalog.artist.tabs");
  const segment = useSelectedLayoutSegment();
  const tabs: ArtistTabKey[] = [
    "discography",
    ...(lineupTab ? [lineupTab] : []),
    ...(hasBiography ? (["biography"] as const) : []),
  ];

  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-ink-border">
        {tabs.map((tab) => {
          const own = SEGMENTS[tab];
          const active = own ? segment === own : segment === null || segment === "__PAGE__";
          const href = own ? `/artist/${artistId}/${own}` : `/artist/${artistId}`;
          return (
            <li key={tab}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex border-b-2 px-3 py-2 font-display text-sm transition-colors ${
                  active ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {t(tab)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
