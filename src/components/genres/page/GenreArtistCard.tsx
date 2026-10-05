import { useTranslations } from "next-intl";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { AppImage } from "@/components/ui/AppImage";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { GenreArtist } from "@/services/genres/artists";

// Tarjeta de artista de la página de género (openspec: redesign-genre-page): foto con licencia libre
// o el disco de reemplazo, nombre enlazado y la cantidad de álbumes *del género* (no del catálogo).

export function GenreArtistCard({ artist }: { artist: GenreArtist }) {
  const t = useTranslations("catalog.genres.page.artists");
  return (
    <Link
      href={artistHref(artist.name, artist.id)}
      className="group flex flex-col items-center gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 text-center transition-colors hover:border-amber"
    >
      {artist.photoUrl ? (
        <div className="relative size-20 overflow-hidden rounded-full border border-ink-border">
          <AppImage src={artist.photoUrl} alt="" fill sizes="5rem" className="object-cover" />
        </div>
      ) : (
        <DiscPlaceholder alt="" className="size-20 rounded-full border border-ink-border" />
      )}
      <span className="line-clamp-2 font-display text-sm text-paper transition-colors group-hover:text-amber [overflow-wrap:anywhere]">
        {artist.name}
      </span>
      <span className="font-data text-xs text-paper-muted">{t("cardAlbums", { count: artist.albumCount })}</span>
    </Link>
  );
}

export function GenreArtistGrid({ artists }: { artists: GenreArtist[] }) {
  return (
    <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <li key={artist.id}>
          <GenreArtistCard artist={artist} />
        </li>
      ))}
    </ul>
  );
}
