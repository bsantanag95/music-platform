import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArtistSearchResult } from "@/services/catalog/search/types";
import { SearchTypeIcon } from "../SearchTypeIcon";

// Resultados del tipo Artistas (openspec: redesign-scoped-search). Con
// homónimos (KISS, Icon) no hay redirección: la primera coincidencia exacta
// va en una tarjeta de "Mejor coincidencia", los demás homónimos debajo con
// su desambiguación, y después las coincidencias no exactas.

function useArtistMeta() {
  const t = useTranslations("catalog");
  return (artist: ArtistSearchResult) =>
    [
      artist.artistType === "unknown" ? null : t(`artist.typeLabels.${artist.artistType}`),
      artist.country,
      artist.disambiguation,
    ]
      .filter(Boolean)
      .join(" · ");
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
    <Link href={`/artist/${artist.id}`} className="group flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-surface text-paper-muted">
        <SearchTypeIcon type="artist" className="size-4" />
      </span>
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

function ArtistList({ artists }: { artists: ArtistSearchResult[] }) {
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

function BestMatch({ artist }: { artist: ArtistSearchResult }) {
  const t = useTranslations("catalog.search.results.artists");
  const meta = useArtistMeta()(artist);
  return (
    <section aria-labelledby={`best-${artist.id}`} className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-data text-xs uppercase tracking-[0.16em] text-amber">
        <span className="size-1.5 rounded-full bg-amber" aria-hidden />
        {t("bestMatch")}
      </h3>
      <Link
        href={`/artist/${artist.id}`}
        className="group flex items-center gap-4 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber/60"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-amber">
          <SearchTypeIcon type="artist" className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span id={`best-${artist.id}`} className="truncate font-display text-xl text-paper">
            {artist.name}
          </span>
          {meta ? <span className="font-data text-xs text-paper-muted">{meta}</span> : null}
          {artist.cached ? <CachedTag /> : null}
        </span>
        <span className="hidden shrink-0 font-data text-xs text-paper-muted transition-colors group-hover:text-amber sm:inline">
          {t("viewProfile")} →
        </span>
      </Link>
    </section>
  );
}

export function ArtistResults({ query, results }: { query: string; results: ArtistSearchResult[] }) {
  const t = useTranslations("catalog.search.results.artists");
  const exact = results.filter((artist) => artist.exact);
  const best = exact[0];
  const homonyms = exact.slice(1);
  const rest = results.filter((artist) => !artist.exact);

  return (
    <div className="flex flex-col gap-6">
      {best ? <BestMatch artist={best} /> : null}

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
