import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { AppImage } from "@/components/ui/AppImage";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { TrySuggestions } from "@/services/catalog/search/try-suggestions";
import { RecentSearches } from "./RecentSearches";

// Portada de /search sin consulta (openspec: refine-search-results-phase2, design D3): búsquedas recientes (del
// navegador), "Prueba con" (lo más activo estos días en la plataforma; sin datos, no aparece) y el consejo
// "Artista - Título". Antes la página era un campo vacío.
export function SearchLanding({ suggestions }: { suggestions: TrySuggestions | null }) {
  const t = useTranslations("catalog.search.landing");
  return (
    <div className="flex w-full flex-col gap-6">
      <RecentSearches />
      {suggestions ? (
        <section aria-labelledby="search-try-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="search-try-heading" className="font-display text-sm text-paper">
              {t("tryHeading")}
            </h2>
            <p className="font-data text-xs text-paper-muted">{t("tryCaption")}</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestions.artists.map((artist) => (
              <li key={artist.id}>
                <Link
                  href={artistHref(artist.name, artist.id)}
                  className="group flex items-center gap-3 rounded-lg border border-ink-border px-3 py-2 transition-colors hover:border-amber/60"
                >
                  {artist.photoUrl ? (
                    <AppImage
                      src={artist.photoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-sm text-paper group-hover:text-amber">{artist.name}</span>
                    <span className="font-data text-xs text-paper-muted">{t("artist")}</span>
                  </span>
                </Link>
              </li>
            ))}
            {suggestions.albums.map((album) => (
              <li key={album.id}>
                <Link
                  href={albumHref(album.artistName, album.title, album.id)}
                  className="group flex items-center gap-3 rounded-lg border border-ink-border px-3 py-2 transition-colors hover:border-amber/60"
                >
                  <CoverThumb cover={album.coverThumbUrl} label="" className="size-10 rounded" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-sm text-paper group-hover:text-amber">{album.title}</span>
                    <span className="truncate font-data text-xs text-paper-muted">
                      {[album.artistName ? t("albumBy", { artist: album.artistName }) : t("album"), album.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* La búsqueda avanzada ya está enlazada bajo el campo. */}
      <p className="font-body text-sm text-paper-muted">{t("tip")}</p>
    </div>
  );
}
