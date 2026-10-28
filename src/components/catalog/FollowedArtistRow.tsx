"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppImage } from "@/components/ui/AppImage";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { toggleFavorite } from "@/lib/api/favorites";
import type { FollowedArtistDto } from "@/lib/api/schemas";
import { FollowedArtistMeta, useUpcomingShortDate } from "./FollowedArtistMeta";

type QuickStatusKind = "favoriteAdded" | "favoriteRemoved" | "favoriteError";

interface FollowedArtistRowProps {
  artist: FollowedArtistDto;
  mode: "index" | "graphic";
  // Deja de seguir; la lista quita la fila y ofrece Deshacer (refine-artists-page-phase1, D2).
  onUnfollow: (artist: FollowedArtistDto) => void;
  // Mientras se deja de seguir: el menú no admite otra acción sobre el mismo artista.
  busy?: boolean;
}

// Fila/tarjeta de un artista seguido, en los dos modos de visualización. Sin botón de seguimiento: el estado ya lo dice
// la página, y "Dejar de seguir" vive en el menú ⋯ con Deshacer (refine-artists-page-phase1, D2–D3).
export function FollowedArtistRow({ artist, mode, onUnfollow, busy = false }: FollowedArtistRowProps) {
  const tUsers = useTranslations("users.artistsFollowed");
  const tFavorites = useTranslations("favorites");
  const [addingToList, setAddingToList] = useState(false);
  const [favorite, setFavorite] = useState(Boolean(artist.favorite));
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [status, setStatus] = useState<QuickStatusKind | null>(null);

  const target = { type: "artist" as const, id: artist.id };
  // Insignia de Gráfico (redesign-artists-rows, D4): la fecha si sale, "Nuevo" si ya salió.
  const upcomingDate = useUpcomingShortDate(artist.news);
  const badge = artist.news ? (upcomingDate ?? tUsers("newBadge")) : null;
  const href = artistHref(artist.name, artist.id);

  const handleToggleFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      const result = await toggleFavorite(target);
      const added = result !== null;
      setFavorite(added);
      setStatus(added ? "favoriteAdded" : "favoriteRemoved");
    } catch {
      setStatus("favoriteError");
    } finally {
      setFavoriteBusy(false);
    }
  };

  const statusMessage = (kind: QuickStatusKind): string => {
    switch (kind) {
      case "favoriteAdded":
        return tFavorites("quickAdded");
      case "favoriteRemoved":
        return tFavorites("quickRemoved");
      case "favoriteError":
        return tFavorites("saveError");
    }
  };

  const menu = (
    <RowMenu
      label={tUsers("menuLabel", { name: artist.name })}
      triggerClassName="size-8 [@media(pointer:coarse)]:size-11"
    >
      <RowMenuItem onSelect={() => setAddingToList((current) => !current)}>{tUsers("addToList")}</RowMenuItem>
      <RowMenuItem onSelect={() => void handleToggleFavorite()}>
        {favorite ? tFavorites("removeFavorite") : tFavorites("addFavorite")}
      </RowMenuItem>
      <RowMenuItem onSelect={() => (busy ? undefined : onUnfollow(artist))}>{tUsers("unfollow")}</RowMenuItem>
    </RowMenu>
  );

  const extras = (
    <>
      {addingToList && <AddToListPanel target={target} onClose={() => setAddingToList(false)} />}
      {status && (
        <span role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
          {statusMessage(status)}
        </span>
      )}
    </>
  );

  if (mode === "graphic") {
    return (
      <li className="flex min-w-0 flex-col gap-1.5">
        <div className="relative">
          <Link
            href={href}
            tabIndex={-1}
            aria-hidden
            className="block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
          >
            {artist.photoUrl ? (
              <div className="relative aspect-square w-full">
                <AppImage src={artist.photoUrl} alt="" fill sizes="160px" className="object-cover" />
              </div>
            ) : (
              <DiscPlaceholder alt="" className="aspect-square w-full" />
            )}
          </Link>
          <div className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 backdrop-blur-sm">{menu}</div>
          {badge ? (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-amber px-1.5 py-0.5 font-data text-[10px] text-ink">
              {badge}
            </span>
          ) : null}
        </div>
        <Link href={href} className="truncate font-data text-xs text-paper transition-colors hover:text-amber">
          {artist.name}
        </Link>
        {extras}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5 px-3 py-2">
      <div className="flex items-center gap-3">
        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
          {artist.photoUrl ? (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
              <AppImage src={artist.photoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
            </div>
          ) : (
            <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={href}
            className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {artist.name}
          </Link>
          <FollowedArtistMeta artist={artist} />
        </div>
        {menu}
      </div>
      {extras}
    </li>
  );
}
