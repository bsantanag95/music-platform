"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import { sameTitleAsQuery } from "@/services/catalog/search/same-title";
import { AlbumQuickActions } from "../AlbumQuickActions";
import { ResultCover } from "./ResultCover";

// Rejilla «Otros discos llamados «x»» (openspec: redesign-search-phase3, design D2). Con 24 discos titulados igual, lo
// que distingue es la carátula y el artista: el artista es el titular y el título solo aparece si difiere de la consulta.
// El menú «…» va sobre la carátula, como en las discografías. La usan la página y «Cargar más».
export function AlbumGrid({
  albums,
  query,
  authenticated,
}: {
  albums: AlbumSearchResult[];
  query: string;
  authenticated: boolean;
}) {
  const t = useTranslations("catalog");
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {albums.map((album) => {
        const open = openId === album.id;
        const meta = [t(`artist.categories.${album.category}`), album.year].filter(Boolean).join(" · ");
        return (
          <li key={album.id} className="group/card relative min-w-0">
            <Link href={albumHref(album.artistName, album.title, album.id)} className="group flex flex-col gap-2">
              <ResultCover item={album} className="aspect-square w-full" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-display text-[0.9375rem] text-paper transition-colors group-hover:text-amber">
                  {album.artistName ?? album.title}
                </span>
                {album.artistName && !sameTitleAsQuery(album.title, query) ? (
                  <span className="truncate font-body text-xs text-paper-muted">{album.title}</span>
                ) : null}
                <span className="truncate font-data text-[11px] text-paper-muted">{meta}</span>
              </span>
            </Link>
            <AlbumQuickActions
              item={album}
              authenticated={authenticated}
              open={open}
              onOpenChange={(next) => setOpenId(next ? album.id : null)}
              variant="cover"
              className={`!absolute right-2 top-2 ${
                open
                  ? "opacity-100"
                  : "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
              }`}
            />
          </li>
        );
      })}
    </ul>
  );
}
