import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import { AppImage } from "@/components/ui/AppImage";
import { countryName } from "@/components/artist/artist-format";
import type { ArtistSearchResult } from "@/services/catalog/search/types";
import { SearchTypeIcon } from "../SearchTypeIcon";

// Resultados del tipo Artistas (openspec: redesign-scoped-search). Con
// homónimos (KISS, Icon) no hay redirección: la primera coincidencia exacta
// va en una tarjeta de "Mejor coincidencia", los demás homónimos debajo con
// su desambiguación, y después las coincidencias no exactas.

// Para elegir entre homónimos (openspec: refine-search-results-phase3): el país por su nombre, los años de actividad
// (o de vida, en una persona) y los discos en el catálogo cuando la discografía ya se exploró.
function useArtistMeta() {
  const t = useTranslations("catalog");
  const locale = useLocale();
  return (artist: ArtistSearchResult) => {
    const begin = artist.beginYear ?? null;
    const end = artist.endYear ?? null;
    const years = begin
      ? end
        ? t("search.results.artists.yearsRange", { begin, end })
        : t("search.results.artists.yearsSince", { begin })
      : null;
    return [
      artist.artistType === "unknown" ? null : t(`artist.typeLabels.${artist.artistType}`),
      countryName(artist.country, locale) ?? artist.country,
      years,
      artist.discCount ? t("search.results.artists.discs", { count: artist.discCount }) : null,
      artist.disambiguation,
    ]
      .filter(Boolean)
      .join(" · ");
  };
}

/** Foto de Commons del artista, o el ícono si no tiene (o fue retirada). */
function ArtistAvatar({ artist, size }: { artist: ArtistSearchResult; size: "sm" | "lg" }) {
  const box = size === "lg" ? "size-14" : "size-10";
  if (artist.photoUrl) {
    return (
      <span className={`relative ${box} shrink-0 overflow-hidden rounded-full bg-ink-surface`}>
        <AppImage src={artist.photoUrl} alt="" fill sizes={size === "lg" ? "3.5rem" : "2.5rem"} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full ${
        size === "lg" ? "bg-ink text-amber" : "bg-ink-surface text-paper-muted"
      }`}
    >
      <SearchTypeIcon type="artist" className={size === "lg" ? "size-6" : "size-4"} />
    </span>
  );
}

function CachedTag() {
  const t = useTranslations("catalog.search.results");
  return (
    <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper-muted">
      <span className="size-1 rounded-full bg-petrol" aria-hidden />
      {t("cachedTag")}
    </span>
  );
}

function ArtistRow({ artist }: { artist: ArtistSearchResult }) {
  const meta = useArtistMeta()(artist);
  return (
    <Link href={artistHref(artist.name, artist.id)} className="group flex items-center gap-3">
      <ArtistAvatar artist={artist} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
          {artist.name}
        </span>
        {meta ? <span className="truncate font-data text-xs text-paper-muted">{meta}</span> : null}
        {artist.cached ? <CachedTag /> : null}
      </span>
    </Link>
  );
}

export function ArtistList({ artists }: { artists: ArtistSearchResult[] }) {
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {artists.map((artist) => (
        <li key={artist.id} className="py-3 first:pt-0 last:pb-0">
          <ArtistRow artist={artist} />
        </li>
      ))}
    </ul>
  );
}

function BestMatch({ artist, genres = [] }: { artist: ArtistSearchResult; genres?: string[] }) {
  const t = useTranslations("catalog.search.results.artists");
  const meta = useArtistMeta()(artist);
  return (
    <section aria-labelledby={`best-${artist.id}`} className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-data text-xs uppercase tracking-[0.16em] text-amber">
        <span className="size-1.5 rounded-full bg-amber" aria-hidden />
        {t("bestMatch")}
      </h3>
      <Link
        href={artistHref(artist.name, artist.id)}
        className="group flex items-center gap-4 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber/60"
      >
        <ArtistAvatar artist={artist} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span id={`best-${artist.id}`} className="truncate font-display text-xl text-paper">
            {artist.name}
          </span>
          {meta ? <span className="font-data text-xs text-paper-muted">{meta}</span> : null}
          {genres.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {genres.map((name) => (
                <span key={name} className="rounded-full border border-ink-border px-2 py-0.5 font-data text-xs text-paper-muted">
                  {name}
                </span>
              ))}
            </span>
          ) : null}
          {artist.cached ? <CachedTag /> : null}
        </span>
        <span className="hidden shrink-0 font-data text-xs text-paper-muted transition-colors group-hover:text-amber sm:inline">
          {t("viewProfile")} →
        </span>
      </Link>
    </section>
  );
}

export function ArtistResults({
  query,
  results,
  bestGenres = [],
}: {
  query: string;
  results: ArtistSearchResult[];
  /** Géneros de la mejor coincidencia (hasta 3), en el idioma de la interfaz. */
  bestGenres?: string[];
}) {
  const t = useTranslations("catalog.search.results.artists");
  const exact = results.filter((artist) => artist.exact);
  const best = exact[0];
  const homonyms = exact.slice(1);
  const rest = results.filter((artist) => !artist.exact);

  return (
    <div className="flex flex-col gap-6">
      {best ? <BestMatch artist={best} genres={bestGenres} /> : null}

      {homonyms.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-sm text-paper-muted">{t("homonyms", { query })}</h3>
          <ArtistList artists={homonyms} />
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="flex flex-col gap-3">
          {best ? <h3 className="font-display text-sm text-paper-muted">{t("more")}</h3> : null}
          <ArtistList artists={rest} />
        </section>
      ) : null}
    </div>
  );
}
