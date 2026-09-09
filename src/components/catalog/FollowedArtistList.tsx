"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { unfollowArtist } from "@/lib/api/catalog";
import type { FollowedArtistDto } from "@/lib/api/schemas";

interface FollowedArtistListProps {
  initial: FollowedArtistDto[];
}

// Lista de gestión de `/me/artists` (openspec: add-artist-following): dejar de
// seguir por fila, con quita optimista.
export function FollowedArtistList({ initial }: FollowedArtistListProps) {
  const t = useTranslations("users");
  const tCat = useTranslations("catalog.artist");
  const [artists, setArtists] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (artists.length === 0) {
    return <p className="font-body text-sm text-paper-muted">{t("artistsFollowedEmpty")}</p>;
  }

  async function remove(id: string) {
    setBusyId(id);
    const prev = artists;
    setArtists((list) => list.filter((a) => a.id !== id));
    try {
      await unfollowArtist(id);
    } catch {
      setArtists(prev);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="flex w-full max-w-2xl flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
      {artists.map((artist) => (
        <li key={artist.id} className="flex items-center gap-3 px-3 py-2">
          {artist.photoUrl ? (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
              <Image src={artist.photoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
            </div>
          ) : (
            <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
          )}
          <Link
            href={`/artist/${artist.id}`}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper hover:text-amber"
          >
            {artist.name}
          </Link>
          <Button
            type="button"
            variant="ghost"
            disabled={busyId === artist.id}
            onClick={() => void remove(artist.id)}
          >
            {tCat("following")}
          </Button>
        </li>
      ))}
    </ul>
  );
}
