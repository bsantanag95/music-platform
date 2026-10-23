"use client";

import { useEffect, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { WantToListenEntry } from "@/lib/api/schemas";
import { ArtistPlate } from "./ArtistPlate";

// Piezas compartidas por las tres vistas de Pendientes (openspec: redesign-want-to-listen-views).

/**
 * Carátula del álbum o foto del artista. La foto va en círculo; sin foto, la inicial (también en círculo) para que
 * un artista no se confunda con un álbum sin carátula.
 */
export function EntryMedia({
  entry,
  className,
  textClassName = "text-xl",
  priority = false,
}: {
  entry: WantToListenEntry;
  className: string;
  textClassName?: string;
  priority?: boolean;
}) {
  if (entry.targetType === "release-group") {
    return <CoverThumb cover={entry.target.coverThumbUrl} label="" className={className} priority={priority} />;
  }
  if (entry.target.coverThumbUrl) {
    return (
      <CoverThumb
        cover={entry.target.coverThumbUrl}
        label=""
        className={`${className} !rounded-full`}
        priority={priority}
      />
    );
  }
  return <ArtistPlate title={entry.target.title} className={`${className} !rounded-full`} textClassName={textClassName} />;
}

/** "Artista · año · tipo" de un álbum; "Artista" para una entrada de artista. */
export function useEntryFacts() {
  const t = useTranslations("wantToListen");
  const tCatalog = useTranslations("catalog.album.workType");
  return (entry: WantToListenEntry, { withArtist = true }: { withArtist?: boolean } = {}): string => {
    if (entry.targetType === "artist") return t("artistLabel");
    const parts: string[] = [];
    if (withArtist && entry.target.artistName) parts.push(entry.target.artistName);
    if (entry.target.year) parts.push(String(entry.target.year));
    const category = entry.target.category;
    if (category && ["studio", "single_ep", "compilation", "live_other"].includes(category)) {
      parts.push(tCatalog(category as "studio"));
    }
    return parts.join(" · ");
  };
}

/**
 * Cuánto hace que se anotó la entrada. Hasta hidratar, el instante de referencia es el `now` de la request (el mismo
 * que usó el servidor) para no desajustar el HTML; después, la hora real.
 */
export function NotedAgo({ iso, prefix = false, className = "" }: { iso: string; prefix?: boolean; className?: string }) {
  const t = useTranslations("wantToListen");
  const format = useFormatter();
  const requestNow = useNow();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const when = format.relativeTime(new Date(iso), hydrated ? new Date() : requestNow);
  return (
    <time dateTime={iso} className={className}>
      {prefix ? t("noted", { when }) : when}
    </time>
  );
}
