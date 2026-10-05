"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlbumQuickActions } from "@/components/catalog/AlbumQuickActions";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { ReleaseGroup } from "@/lib/api/schemas";

// Fila de álbum de la vista lista de la pestaña Álbumes (openspec: redesign-genre-page, capability
// `genre-page-catalog`): carátula pequeña, título, artista principal, año, tipo y el mismo menú de
// acciones del disco que tiene la tarjeta de la cuadrícula.

interface GenreAlbumRowProps {
  album: ReleaseGroup;
  artist: { id: string; name: string } | null;
  categoryLabel: string;
  coverLabel: string;
  authenticated: boolean;
}

export function GenreAlbumRow({ album, artist, categoryLabel, coverLabel, authenticated }: GenreAlbumRowProps) {
  const t = useTranslations("catalog.genres.page.albumRow");
  const [menuOpen, setMenuOpen] = useState(false);
  const href = albumHref(artist?.name ?? null, album.title, album.id);

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-ink-border bg-ink-surface p-2 transition-colors hover:border-amber">
      <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden="true">
        {album.coverResolved ? (
          <CoverThumb cover={album.coverThumbUrl} label="" className="size-12" />
        ) : (
          <LazyCoverImage releaseGroupId={album.id} coverLabel={coverLabel} className="size-12" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="block truncate font-display text-sm text-paper hover:text-amber">
          {album.title}
        </Link>
        {artist && (
          <Link href={artistHref(artist.name, artist.id)} className="block truncate font-data text-xs text-paper-muted hover:text-paper">
            {artist.name}
          </Link>
        )}
      </div>
      <p className="hidden shrink-0 font-data text-xs text-paper-muted sm:block">
        {album.firstReleaseYear !== null ? album.firstReleaseYear : t("yearUnknown")} · {categoryLabel}
      </p>
      <AlbumQuickActions
        item={album}
        authenticated={authenticated}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        variant="row"
      />
    </div>
  );
}
