"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LazyCoverImage } from "./LazyCoverImage";
import { CoverThumb } from "./CoverThumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { SEARCH_TABS, type SearchTab } from "./search-tabs";
import type { CatalogSearchResult, CatalogSongContext } from "@/lib/api/schemas";

const TAB_LABEL_KEY: Record<SearchTab, string> = {
  all: "search.results.tabAll",
  artists: "search.results.tabArtists",
  albums: "search.results.tabAlbums",
};

interface SearchResultsProps {
  results: CatalogSearchResult[];
  query: string;
  initialTab?: SearchTab;
  /** Contexto opcional "álbumes que contienen «canción»" (add-recording-album-search). */
  songContext?: CatalogSongContext;
}

// Client Component por dos motivos: la pestaña activa (la lista ya llega
// resuelta y ordenada del Server Component de /search) y su reflejo en la URL.
// El filtro por tipo NO hace round-trip: cambiar `?type=` con router.replace
// re-ejecutaría `searchCatalog`. Se usa la History API nativa, que el App
// Router sincroniza con useSearchParams; el servidor solo lee `type` en la
// carga inicial y lo pasa como `initialTab`.
//
// La canción NO es un resultado navegable ni una pestaña: su contexto es una
// sección aparte, arriba de todo, que enlaza a los álbumes que la contienen.
export function SearchResults({
  results,
  query,
  initialTab = "all",
  songContext,
}: SearchResultsProps) {
  const t = useTranslations("catalog");
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const baseId = useId();

  const counts = {
    all: results.length,
    artists: results.filter((result) => result.kind === "artist").length,
    albums: results.filter((result) => result.kind === "release-group").length,
  } satisfies Record<SearchTab, number>;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", activeTab);
    window.history.replaceState(window.history.state, "", url);
  }, [activeTab]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = SEARCH_TABS.indexOf(activeTab);
    const next =
      event.key === "ArrowRight"
        ? SEARCH_TABS[(index + 1) % SEARCH_TABS.length]!
        : SEARCH_TABS[(index - 1 + SEARCH_TABS.length) % SEARCH_TABS.length]!;
    setActiveTab(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const summary = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="min-w-0 break-words font-display text-lg text-paper">
        {t("search.results.summary", { query })}
      </h2>
      <span className="shrink-0 font-data text-xs text-paper-muted">
        {t("search.results.count", { count: results.length })}
      </span>
    </div>
  );

  // Sin resultados y sin contexto de canción: estado vacío propio, con puente
  // a la búsqueda de usuarios. Con contexto de canción la sección de arriba ya
  // responde la búsqueda, así que no se corta acá.
  if (results.length === 0 && !songContext) {
    return (
      <section className="flex w-full flex-col gap-4">
        {summary}
        <EmptyState
          title={t("search.results.emptyTitle")}
          description={t("search.results.emptyDescription")}
          action={
            <Link
              href={`/users?q=${encodeURIComponent(query)}`}
              className="font-data text-sm text-amber transition-colors hover:text-amber-hover"
            >
              {t("search.results.emptyUsersLink", { query })}
            </Link>
          }
        />
      </section>
    );
  }

  const visible =
    activeTab === "all"
      ? results
      : results.filter((result) =>
          activeTab === "artists"
            ? result.kind === "artist"
            : result.kind === "release-group",
        );

  return (
    <section className="flex w-full flex-col gap-6">
      {songContext ? <SongContextSection context={songContext} /> : null}

      <div className="flex w-full flex-col gap-4">
        {results.length > 0 ? summary : null}

        <div
          role="tablist"
          aria-label={t("search.results.tabsLabel")}
          onKeyDown={onKeyDown}
          className="flex flex-wrap gap-2"
        >
          {SEARCH_TABS.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                id={`${baseId}-tab-${tab}`}
                type="button"
                role="tab"
                aria-label={t(TAB_LABEL_KEY[tab])}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                  selected
                    ? "border-amber text-paper"
                    : "border-ink-border text-paper-muted hover:text-paper"
                }`}
              >
                {t(TAB_LABEL_KEY[tab])}
                <span aria-hidden className="text-paper-muted"> · {counts[tab]}</span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${activeTab}`}
        >
          {visible.length === 0 ? (
            // Con contexto de canción en "Todo", la sección de arriba ya
            // responde la búsqueda: el "sin coincidencias" solo confundiría.
            activeTab === "all" && songContext ? null : (
              <EmptyState
                title={t("search.results.emptyTitle")}
                description={t("search.results.emptyDescription")}
              />
            )
          ) : (
            <ul className="flex flex-col divide-y divide-ink-border">
              {visible.map((result) => (
                <li
                  key={`${result.kind}-${result.id}`}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <SearchResultRow result={result} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function SearchResultRow({ result }: { result: CatalogSearchResult }) {
  const t = useTranslations("catalog");
  const isArtist = result.kind === "artist";

  const meta = isArtist
    ? [
        result.artistType ? t(`artist.typeLabels.${result.artistType}`) : null,
        result.subtitle,
      ]
    : [
        result.subtitle,
        result.category ? t(`artist.categories.${result.category}`) : null,
        result.year !== null ? String(result.year) : null,
      ];
  const metaText = meta.filter(Boolean).join(" · ");

  return (
    <Link
      href={isArtist ? `/artist/${result.id}` : `/album/${result.id}`}
      className="group flex gap-3"
    >
      {isArtist ? (
        <CoverThumb cover={null} label="" className="size-10" />
      ) : (
        <LazyCoverImage releaseGroupId={result.id} coverLabel="" className="size-10 shrink-0" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
          {result.name}
        </span>
        {metaText ? (
          <span className="truncate font-data text-xs text-paper-muted">{metaText}</span>
        ) : null}
        {result.cached ? (
          <span className="mt-0.5 inline-flex items-center gap-1.5 font-data text-xs text-paper-muted">
            <span className="size-1 rounded-full bg-petrol" aria-hidden />
            {t("search.results.cachedTag")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

// Cuántos álbumes se ven antes de "Ver más". Una canción muy versionada
// aparece en decenas de compilados; el corte deja arriba lo esencial y el
// resto queda a un clic.
const SONG_CONTEXT_VISIBLE = 5;

// Sección contextual (no una pestaña): los álbumes que contienen la canción
// detectada. Toma lo mejor de las dos iteraciones — un único panel
// `ink-surface` con hairline que la separa como "esto responde tu búsqueda"
// (sin marco ámbar ni tarjetas anidadas), y adentro la lista densa con
// hairlines del resto de resultados. La veta de ámbar queda en un punto
// junto al encabezado, como una aguja de VU. El título de la canción es dato
// del catálogo — no se traduce (business-rules.md).
function SongContextSection({ context }: { context: CatalogSongContext }) {
  const t = useTranslations("catalog");
  const [expanded, setExpanded] = useState(false);

  const total = context.albums.length;
  const visible = expanded ? context.albums : context.albums.slice(0, SONG_CONTEXT_VISIBLE);
  const hidden = total - visible.length;

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
      <h2 className="flex items-center gap-2 font-display text-base text-paper">
        <span className="size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
        {t("search.results.songContext.title", { song: context.title })}
      </h2>

      <ul className="flex flex-col divide-y divide-ink-border">
        {visible.map((album) => {
          const meta = [
            context.artistName,
            t(`artist.categories.${album.category}`),
            album.year !== null ? String(album.year) : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={album.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/album/${album.id}`} className="group flex gap-3">
                <LazyCoverImage
                  releaseGroupId={album.id}
                  coverLabel=""
                  className="size-10 shrink-0"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {album.title}
                  </span>
                  {meta ? (
                    <span className="truncate font-data text-xs text-paper-muted">{meta}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {total > SONG_CONTEXT_VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {expanded
            ? t("search.results.songContext.showLess")
            : t("search.results.songContext.showMore", { count: hidden })}
        </button>
      ) : null}
    </section>
  );
}
