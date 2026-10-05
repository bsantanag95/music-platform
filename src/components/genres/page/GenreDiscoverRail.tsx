import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GenreArtist } from "@/services/genres/artists";
import { genrePageHref, type GenrePageParams } from "@/services/genres/page-params";
import { GenreArtistGrid } from "./GenreArtistCard";

// Riel «Para descubrir» del Resumen (openspec: add-genre-artist-discovery, capability
// `genre-artist-discovery`): artistas con discografía corta y debut conocido, sin los que la persona ya
// conoce. Con sesión lleva el subtítulo «Sin los artistas que ya conoces» para que la exclusión sea
// visible, y «Ver todo →» arrastra el filtro `conocidos=no` explícito en la URL (reversible). Sin
// artistas elegibles (el servicio ya aplicó el umbral) no se renderiza.

interface GenreDiscoverRailProps {
  slug: string;
  params: GenrePageParams;
  artists: GenreArtist[];
  authenticated: boolean;
}

export function GenreDiscoverRail({ slug, params, artists, authenticated }: GenreDiscoverRailProps) {
  const t = useTranslations("catalog.genres.page.artists");
  if (artists.length === 0) return null;
  const seeAll = genrePageHref(slug, params, {
    tab: "artists",
    artistSort: "discover",
    shortOnly: true,
    hideKnown: authenticated,
    country: undefined,
    debutDecade: undefined,
    q: "",
    page: 1,
  });

  return (
    <section aria-labelledby="genre-discover-heading" className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="genre-discover-heading" className="font-display text-xl text-paper">
            {t("discoverHeading")}
          </h2>
          {authenticated && <p className="font-data text-xs text-paper-muted">{t("discoverSubtitle")}</p>}
        </div>
        <Link href={seeAll} className="font-data text-sm text-amber underline-offset-2 hover:underline">
          {t("seeAll")} →
        </Link>
      </div>
      <GenreArtistGrid artists={artists} authenticated={authenticated} />
    </section>
  );
}
