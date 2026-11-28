import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { formatStars } from "@/components/album/album-format";
import type { AlbumSearchResult } from "@/services/catalog/search/types";
import type { TracklistPreview } from "@/services/catalog/search/tracklist-preview";
import { coverageLevel } from "@/services/catalog/search/coverage";
import { normalizeSearchText } from "@/services/catalog/search/normalize";
import { LazyCoverImage } from "../LazyCoverImage";
import { MetaLine } from "./MetaLine";

// Ficha del disco buscado en Álbumes (openspec: redesign-search-phase2, design D3): carátula grande (miniatura de 250 px,
// nunca resolución completa), datos, media de la comunidad, primeras canciones si la tracklist ya está guardada (la
// búsqueda no ingiere) y «Ver el disco». Los otros discos del mismo artista con el mismo título se enlazan como «También».

/** Hay ficha cuando el primer resultado cubre la consulta: título igual a ella, o artista + título. */
export function albumAnswerOf(query: string, results: AlbumSearchResult[]): AlbumSearchResult | null {
  const [first] = results;
  if (!first) return null;
  return coverageLevel(query, first.title, first.artistName ? [first.artistName] : []) <= 2 ? first : null;
}

/** Otros discos del mismo artista con el mismo título (el single de 2023 junto a The Wall de 1979). */
export function albumSiblingsOf(answer: AlbumSearchResult, results: AlbumSearchResult[]): AlbumSearchResult[] {
  const title = normalizeSearchText(answer.title);
  const artist = normalizeSearchText(answer.artistName ?? "");
  return results.filter(
    (album) =>
      album.id !== answer.id &&
      normalizeSearchText(album.title) === title &&
      normalizeSearchText(album.artistName ?? "") === artist,
  );
}

export function AlbumAnswer({
  album,
  siblings,
  tracks,
}: {
  album: AlbumSearchResult;
  siblings: AlbumSearchResult[];
  tracks: TracklistPreview | null;
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const average = album.community?.average ?? null;
  const href = albumHref(album.artistName, album.title, album.id);
  return (
    <section aria-labelledby={`album-answer-${album.id}`} className="flex flex-col">
      <h3 className="sr-only">{t("search.results.albums.answerLabel")}</h3>
      <article className="grid grid-cols-1 gap-5 rounded-xl border border-ink-border bg-ink-surface p-5 sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:gap-7 sm:p-6">
        <Link href={href} className="block w-40 sm:w-[12.5rem]" tabIndex={-1} aria-hidden>
          <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="aspect-square w-full" />
        </Link>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Link
              id={`album-answer-${album.id}`}
              href={href}
              className="wrap-break-word font-display text-2xl font-bold leading-tight tracking-[-0.015em] text-paper transition-colors hover:text-amber sm:text-3xl"
            >
              {album.title}
            </Link>
            {album.artistName ? <p className="font-display text-lg text-paper-muted">{album.artistName}</p> : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <MetaLine
              segments={[
                { text: t(`artist.categories.${album.category}`) },
                { text: album.year !== null ? String(album.year) : null },
              ]}
            />
            {average !== null ? (
              <span className="font-data text-xs text-paper-muted" title={t("search.results.albums.communityTitle", { count: album.community?.count ?? 0 })}>
                <span aria-hidden className="text-amber">★ </span>
                {t("search.results.albums.community", { average: formatStars(average, locale), count: album.community?.count ?? 0 })}
              </span>
            ) : null}
          </div>
          {tracks ? (
            <ol className="grid grid-cols-1 gap-x-6 gap-y-1 font-body text-sm text-paper-muted sm:grid-cols-2">
              {tracks.titles.map((title, index) => (
                <li key={`${index}-${title}`} className="flex min-w-0 gap-2">
                  <span className="w-5 shrink-0 text-right font-data text-xs leading-5 text-paper-muted/70">{index + 1}</span>
                  <span className="truncate">{title}</span>
                </li>
              ))}
              {tracks.total > tracks.titles.length ? (
                <li className="pl-7 font-data text-xs leading-5 text-paper-muted sm:col-span-2">
                  {t("search.results.albums.tracksMore", { count: tracks.total - tracks.titles.length })}
                </li>
              ) : null}
            </ol>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link
              href={href}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-amber px-5 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
            >
              {t("search.results.albums.viewAlbum")} <span aria-hidden>→</span>
            </Link>
            {siblings.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2 font-data text-xs text-paper-muted">
                {t("search.results.albums.also")}
                {siblings.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={albumHref(sibling.artistName, sibling.title, sibling.id)}
                    className="inline-flex h-9 items-center rounded-full border border-ink-border px-3 text-paper transition-colors hover:border-amber/60 hover:text-amber"
                  >
                    {[t(`artist.categories.${sibling.category}`), sibling.year].filter(Boolean).join(" · ")}
                  </Link>
                ))}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
