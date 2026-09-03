"use client";

import { useState, useId } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LazyCoverImage } from "./LazyCoverImage";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CatalogSearchResult } from "@/lib/api/schemas";

type Tab = "all" | "artists" | "albums";

const TABS: { id: Tab; labelKey: string }[] = [
  { id: "all", labelKey: "search.results.tabAll" },
  { id: "artists", labelKey: "search.results.tabArtists" },
  { id: "albums", labelKey: "search.results.tabAlbums" },
];

interface SearchResultsProps {
  results: CatalogSearchResult[];
}

// Client Component solo por el estado de la pestaña activa: el listado llega
// ya resuelto y ordenado desde el Server Component de /search. Las filas
// enlazan directo a su vista destino, que es donde ocurre la ingesta fría.
export function SearchResults({ results }: SearchResultsProps) {
  const t = useTranslations("catalog");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const baseId = useId();

  const visible =
    activeTab === "all"
      ? results
      : results.filter((result) =>
          activeTab === "artists"
            ? result.kind === "artist"
            : result.kind === "release-group",
        );

  return (
    <section className="flex w-full flex-col gap-4">
      <div
        role="tablist"
        aria-label={t("search.results.tabsLabel")}
        className="flex gap-1 border-b border-ink-border"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${baseId}-panel`}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 font-data text-sm transition-colors ${
              activeTab === tab.id
                ? "border-amber text-paper"
                : "border-transparent text-paper-muted hover:text-paper"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${activeTab}`}
      >
        {visible.length === 0 ? (
          <EmptyState
            title={t("search.results.emptyTitle")}
            description={t("search.results.emptyDescription")}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((result) => (
              <li key={`${result.kind}-${result.id}`}>
                <SearchResultRow result={result} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SearchResultRow({ result }: { result: CatalogSearchResult }) {
  const t = useTranslations("catalog");

  if (result.kind === "artist") {
    return (
      <Link
        href={`/artist/${result.id}`}
        className="flex flex-col gap-0.5 rounded-lg border border-ink-border bg-ink-surface px-4 py-3 transition-colors hover:border-amber"
      >
        <span className="font-display text-sm text-paper">{result.name}</span>
        <span className="font-data text-xs text-paper-muted">
          {result.artistType ? t(`artist.typeLabels.${result.artistType}`) : null}
          {result.artistType && result.subtitle ? " · " : null}
          {result.subtitle}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/album/${result.id}`}
      className="flex items-center gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
    >
      <LazyCoverImage
        releaseGroupId={result.id}
        coverLabel={t("album.coverLabel")}
        className="h-12 w-12 shrink-0"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper">{result.name}</span>
        <span className="font-data text-xs text-paper-muted">
          {result.subtitle ?? null}
          {result.subtitle && result.category ? " · " : null}
          {result.category ? t(`artist.categories.${result.category}`) : null}
          {result.year !== null ? ` · ${result.year}` : null}
        </span>
      </span>
    </Link>
  );
}
