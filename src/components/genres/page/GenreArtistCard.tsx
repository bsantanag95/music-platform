import { useTranslations } from "next-intl";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { AppImage } from "@/components/ui/AppImage";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { GenreArtist } from "@/services/genres/artists";
import { GenreFollowButton } from "./GenreFollowButton";

// Tarjeta de artista de la página de género (openspec: redesign-genre-page y add-genre-artist-discovery):
// foto con licencia libre o el disco de reemplazo, nombre enlazado, la cantidad de álbumes *del género*
// (o siempre «Discografía sin explorar» cuando la discografía no se recorrió entera: una cantidad parcial se
// leería como el total), un
// disco destacado como razón para entrar y, con sesión, «Ya lo conoces» y el botón de seguir. Los enlaces
// y el botón son hermanos: nunca hay un control interactivo dentro de un enlace.

export function GenreArtistCard({ artist, authenticated = false }: { artist: GenreArtist; authenticated?: boolean }) {
  const t = useTranslations("catalog.genres.page.artists");
  const showKnown = authenticated && artist.known === true && artist.following !== true;
  const featured = artist.featuredAlbum;

  return (
    <div className="flex h-full flex-col items-center gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 text-center transition-colors hover:border-amber">
      <Link href={artistHref(artist.name, artist.id)} className="group flex flex-col items-center gap-2">
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
      </Link>
      <span className="font-data text-xs text-paper-muted">
        {artist.discographyComplete ? t("cardAlbums", { count: artist.albumCount }) : t("cardUnexplored")}
      </span>
      {featured && (
        <Link
          href={albumHref(artist.name, featured.title, featured.id)}
          className="line-clamp-2 font-data text-xs text-paper-muted underline-offset-2 hover:text-paper hover:underline [overflow-wrap:anywhere]"
        >
          {t("featuredAlbum", { title: featured.title })}
          {featured.year !== null && <span> · {featured.year}</span>}
        </Link>
      )}
      {showKnown && <span className="rounded bg-ink-border px-1.5 py-0.5 font-data text-[0.625rem] text-paper">{t("knownBadge")}</span>}
      {authenticated && (
        <div className="mt-auto pt-1">
          <GenreFollowButton artistId={artist.id} artistName={artist.name} initialFollowing={artist.following === true} />
        </div>
      )}
    </div>
  );
}

export function GenreArtistGrid({ artists, authenticated = false }: { artists: GenreArtist[]; authenticated?: boolean }) {
  return (
    <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <li key={artist.id}>
          <GenreArtistCard artist={artist} authenticated={authenticated} />
        </li>
      ))}
    </ul>
  );
}
