"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";
import { toggleFavorite } from "@/lib/api/favorites";
import type { FollowedArtistDto } from "@/lib/api/schemas";

type QuickStatusKind = "favoriteAdded" | "favoriteRemoved" | "favoriteError";

interface FollowedArtistRowProps {
  artist: FollowedArtistDto;
  mode: "index" | "graphic";
}

// Fila/tarjeta de un artista seguido, en los dos modos de visualización. El
// botón "Siguiendo"/"Seguir" es un toggle optimista de verdad (no un botón de
// quitar disfrazado): un clic accidental se deshace con otro clic, y la fila
// solo desaparece de la lista al salir de la sección o recargar (ver
// `FollowedArtistList`, que no filtra el array local — el próximo fetch del
// servidor ya no va a traer a quien se dejó de seguir).
export function FollowedArtistRow({ artist, mode }: FollowedArtistRowProps) {
  const tUsers = useTranslations("users");
  const tLists = useTranslations("lists");
  const tFavorites = useTranslations("favorites");
  const [following, setFollowing] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [status, setStatus] = useState<QuickStatusKind | null>(null);

  const target = { type: "artist" as const, id: artist.id };
  const href = `/artist/${artist.id}`;

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followArtist(artist.id);
      else await unfollowArtist(artist.id);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      const result = await toggleFavorite(target);
      setStatus(result !== null ? "favoriteAdded" : "favoriteRemoved");
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
    <RowMenu label={tLists("itemMenuLabel")}>
      <RowMenuItem onSelect={() => setAddingToList((current) => !current)}>
        {tLists("addItem")}
      </RowMenuItem>
      <RowMenuItem onSelect={() => void handleToggleFavorite()}>{tFavorites("addFavorite")}</RowMenuItem>
    </RowMenu>
  );

  const followButton = (
    <Button
      type="button"
      variant={following ? "primary" : "secondary"}
      disabled={followBusy}
      onClick={() => void toggleFollow()}
    >
      {following ? tUsers("following") : tUsers("follow")}
    </Button>
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
      <li className="flex flex-col gap-1.5">
        <div className="relative">
          <Link
            href={href}
            className="block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
          >
            {artist.photoUrl ? (
              <div className="relative aspect-square w-full">
                <Image src={artist.photoUrl} alt="" fill sizes="160px" className="object-cover" />
              </div>
            ) : (
              <DiscPlaceholder alt="" className="aspect-square w-full" />
            )}
          </Link>
          <div className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 backdrop-blur-sm">{menu}</div>
        </div>
        <Link
          href={href}
          className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
        >
          {artist.name}
        </Link>
        {followButton}
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
              <Image src={artist.photoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
            </div>
          ) : (
            <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
          )}
        </Link>
        <Link
          href={href}
          className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {artist.name}
        </Link>
        {followButton}
        {menu}
      </div>
      {extras}
    </li>
  );
}
