"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import { LazyCoverImage } from "../LazyCoverImage";
import { AlbumQuickActions } from "../AlbumQuickActions";

// Filas del tipo Álbumes (openspec: redesign-scoped-search). Las usa la página y también
// "Cargar más", que agrega páginas en el cliente. Cada fila lleva el menú de acciones del disco
// al final, fuera del enlace (openspec: extend-album-quick-actions).

export function AlbumRow({ album }: { album: AlbumSearchResult }) {
  const t = useTranslations("catalog");
  const meta = [
    album.artistName,
    t(`artist.categories.${album.category}`),
    album.year !== null ? String(album.year) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/album/${album.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
      <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-12 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
          {album.title}
        </span>
        {meta ? <span className="truncate font-data text-xs text-paper-muted">{meta}</span> : null}
        {album.cached ? (
          <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper-muted">
            <span className="size-1 rounded-full bg-petrol" aria-hidden />
            {t("search.results.cachedTag")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function AlbumList({ albums, authenticated }: { albums: AlbumSearchResult[]; authenticated: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {albums.map((album) => (
        <li key={album.id} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
          <AlbumRow album={album} />
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
