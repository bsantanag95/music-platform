import Image from "next/image";
import { DiscPlaceholder } from "./DiscPlaceholder";
import type { ArtistRow } from "@/db/schema";

interface ArtistHeaderProps {
  artist: ArtistRow;
  typeLabel: string;
  noPhotoAlt: string;
}

// Componente de presentación (Server Component): recibe las etiquetas ya
// traducidas para no acoplar el render a next-intl. El nombre, tipo y bio
// del artista son datos de MusicBrainz y no se traducen.
export function ArtistHeader({ artist, typeLabel, noPhotoAlt }: ArtistHeaderProps) {
  return (
    <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      {artist.photoUrl ? (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full">
          <Image
            src={artist.photoUrl}
            alt={artist.name}
            fill
            sizes="7rem"
            className="object-cover"
          />
        </div>
      ) : (
        <DiscPlaceholder alt={noPhotoAlt} className="h-28 w-28 shrink-0 rounded-full" />
      )}
      <div className="min-w-0">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
          {typeLabel}
        </p>
        <h1 className="font-display text-3xl text-paper">{artist.name}</h1>
        {artist.bio && <p className="mt-2 max-w-2xl font-body text-paper-muted">{artist.bio}</p>}
      </div>
    </header>
  );
}
