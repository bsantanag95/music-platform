"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyCollection, getUserCollection, removeCollectionEntry } from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import { COLLECTION_FORMATS, EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import type { CollectionListResponse, CollectionEntry } from "@/lib/api/schemas";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";

interface CollectionListProps {
  initial: CollectionListResponse;
  readOnly?: boolean;
  username?: string;
  empty?: { title: string; description: string };
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

const PAGE_SIZE = 20;

export function CollectionList({ initial, readOnly, username, empty }: CollectionListProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  const [entries, setEntries] = useState<CollectionEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [format, setFormat] = useState<CollectionFormat | "">("");
  const [attribute, setAttribute] = useState<EditionAttribute | "">("");

  const fetchPage = (nextPage: number) => {
    const query = {
      page: nextPage,
      pageSize: PAGE_SIZE,
      format: format || undefined,
      attribute: attribute || undefined,
    };
    return readOnly && username ? getUserCollection(username, query) : getMyCollection(query);
  };

  const applyFilters = async (
    nextFormat: CollectionFormat | "",
    nextAttribute: EditionAttribute | "",
  ) => {
    setFormat(nextFormat);
    setAttribute(nextAttribute);
    setLoading(true);
    setLoadError(false);
    try {
      const query = {
        page: 1,
        pageSize: PAGE_SIZE,
        format: nextFormat || undefined,
        attribute: nextAttribute || undefined,
      };
      const result =
        readOnly && username ? await getUserCollection(username, query) : await getMyCollection(query);
      setEntries(result.entries);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (entry: CollectionEntry) => {
    setLoading(true);
    setLoadError(false);
    try {
      await removeCollectionEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (error) {
      if (error instanceof ApiError && error.code === "COLLECTION_ENTRY_NOT_FOUND") {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await fetchPage(page + 1);
      setEntries((current) => [...current, ...next.entries]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const filtersActive = format !== "" || attribute !== "";

  const filterControls = !readOnly && (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("filterByFormat")}
        <select
          value={format}
          onChange={(event) => void applyFilters(event.target.value as CollectionFormat | "", attribute)}
          className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper"
        >
          <option value="">{t("allFormats")}</option>
          {COLLECTION_FORMATS.map((value) => (
            <option key={value} value={value}>
              {t(`format.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("filterByAttribute")}
        <select
          value={attribute}
          onChange={(event) =>
            void applyFilters(format, event.target.value as EditionAttribute | "")
          }
          className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper"
        >
          <option value="">{t("allAttributes")}</option>
          {EDITION_ATTRIBUTES.map((value) => (
            <option key={value} value={value}>
              {t(`attribute.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {filtersActive && (
        <Button variant="ghost" disabled={loading} onClick={() => void applyFilters("", "")}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  if (entries.length === 0 && !filtersActive) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {filterControls}
        <EmptyState
          title={empty?.title ?? t("emptyTitle")}
          description={empty?.description ?? t("emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {filterControls}

      {entries.length === 0 ? (
        <p className="font-body text-sm text-paper-muted" role="status">
          {t("emptyDescription")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded border border-ink-border bg-ink-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/album/${entry.album.id}`}
                    className="font-display text-lg text-paper transition-colors hover:text-amber"
                  >
                    {entry.album.title}
                  </Link>
                  {entry.album.artistName && entry.album.artistId && (
                    <Link
                      href={`/artist/${entry.album.artistId}`}
                      className="ml-2 font-data text-sm text-paper-muted transition-colors hover:text-paper"
                    >
                      {entry.album.artistName}
                    </Link>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-data text-xs">
                    <span className="rounded border border-ink-border px-1.5 py-0.5 text-paper">
                      {t(`format.${entry.format}`)}
                    </span>
                    {entry.attributes.map((value) => (
                      <span
                        key={value}
                        className="rounded border border-ink-border px-1.5 py-0.5 text-paper-muted"
                      >
                        {t(`attribute.${value}`)}
                      </span>
                    ))}
                  </div>
                  {entry.note && (
                    <p className="mt-1 font-body text-sm text-paper-muted">{entry.note}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                    {!readOnly && <span>{t(`audience.${entry.audience}`)}</span>}
                    <time dateTime={entry.createdAt}>{formatDate(entry.createdAt, locale)}</time>
                  </div>
                </div>
                {!readOnly && (
                  <Button variant="ghost" disabled={loading} onClick={() => void handleRemove(entry)}>
                    {loading ? t("saving") : t("remove")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasNext && (
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void handleLoadMore()}
          className="self-center"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {loadError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}
