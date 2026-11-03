"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatStars } from "@/components/album/album-format";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import type { ResultHighlight } from "@/services/catalog/search/filters";
import { MetaLine } from "./MetaLine";
import { LazyCoverImage } from "../LazyCoverImage";
import { AlbumQuickActions } from "../AlbumQuickActions";

// Filas del tipo Álbumes (openspec: redesign-scoped-search). Las usa la página y también
// "Cargar más", que agrega páginas en el cliente. Cada fila lleva el menú de acciones del disco
// al final, fuera del enlace (openspec: extend-album-quick-actions).

export function AlbumRow({ album, highlight = [] }: { album: AlbumSearchResult; highlight?: ResultHighlight[] }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  // Media de la comunidad (desde 5 valoraciones) y la nota propia (openspec: refine-search-results-phase3).
  const average = album.community?.average ?? null;
  const yours = album.yourStars ?? null;
  // En la búsqueda avanzada, los datos filtrados se destacan (openspec: refine-advanced-search-phase3).
  const meta = [
    { text: album.artistName, hit: highlight.includes("artist") },
    { text: t(`artist.categories.${album.category}`), hit: highlight.includes("category") },
    { text: album.year !== null ? String(album.year) : null, hit: highlight.includes("year") },
  ];

  return (
    <Link href={albumHref(album.artistName, album.title, album.id)} className="group flex min-w-0 flex-1 items-center gap-3">
      <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-12 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
          {album.title}
        </span>
        <MetaLine segments={meta} className="truncate" />
        {album.cached ? (
          <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper-muted">
            <span className="size-1 rounded-full bg-petrol" aria-hidden />
            {t("search.results.cachedTag")}
          </span>
        ) : null}
      </span>
      {average !== null || yours !== null ? (
        <span className="flex shrink-0 flex-col items-end gap-0.5 font-data text-xs">
          {average !== null ? (
            <span className="text-paper-muted" title={t("search.results.albums.communityTitle", { count: album.community?.count ?? 0 })}>
              <span aria-hidden>★ </span>
              {t("search.results.albums.community", {
                average: formatStars(average, locale),
                count: album.community?.count ?? 0,
              })}
            </span>
          ) : null}
          {yours !== null ? (
            <span className="text-amber">{t("search.results.albums.yours", { stars: formatStars(yours, locale) })}</span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

export function AlbumList({
  albums,
  authenticated,
  highlight,
}: {
  albums: AlbumSearchResult[];
  authenticated: boolean;
  highlight?: ResultHighlight[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {albums.map((album) => (
        <li key={album.id} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
          <AlbumRow album={album} highlight={highlight} />
          <AlbumQuickActions
            item={album}
            authenticated={authenticated}
            open={openId === album.id}
            onOpenChange={(next) => setOpenId(next ? album.id : null)}
            variant="row"
            className="shrink-0"
          />
        </li>
      ))}
    </ul>
  );
}
