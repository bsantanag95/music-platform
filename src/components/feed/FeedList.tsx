"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReactionBadge } from "@/components/diary/ReactionBadge";
import { getFeed } from "@/lib/api/diary";
import type { FeedEntry, FeedResponse } from "@/lib/api/schemas";

interface FeedListProps {
  initial: FeedResponse;
  empty?: { title: string; description: string };
}

function targetHref(type: "artist" | "release-group" | "recording", id: string): string {
  if (type === "artist") return `/artist/${id}`;
  if (type === "release-group") return `/album/${id}`;
  return `/song/${id}`;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Feed de actividad: escuchas, favoritos y eventos de listas de los usuarios
// seguidos. Cada tipo de entrada se renderiza según su `kind` con jerarquía
// visual: las entradas con texto (escucha con impresión) tienen más peso.
export function FeedList({ initial, empty }: FeedListProps) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const [entries, setEntries] = useState<FeedEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (entries.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? t("emptyTitle")}
        description={empty?.description ?? t("emptyDescription")}
      />
    );
  }

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getFeed(page + 1, 20);
      setEntries((current) => [...current, ...next.entries]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={`${entry.kind}-${entry.id}`} className="rounded border border-ink-border bg-ink-surface p-4">
            <div className="min-w-0">
              <Link
                href={`/users/${encodeURIComponent(entry.author.username)}`}
                className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
              >
                {entry.author.displayName ?? `@${entry.author.username}`}
              </Link>
              <FeedBody entry={entry} t={t} />
              <time dateTime={entry.createdAt} className="mt-1 block font-data text-xs text-paper-muted">
                {formatDate(entry.createdAt, locale)}
              </time>
            </div>
          </li>
        ))}
      </ul>
      {hasNext && (
        <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()} className="self-center">
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

function FeedBody({
  entry,
  t,
}: {
  entry: FeedEntry;
  t: (key: string) => string;
}) {
  if (entry.kind === "listen") {
    return (
      <div className="flex flex-col gap-1">
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
          <span>{t(`context.${entry.listenContext}`)}</span>
          <ReactionBadge reaction={entry.reaction} />
          <span>{t(`audience.${entry.audience}`)}</span>
        </div>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
        {entry.body ? <p className="mt-1 whitespace-pre-wrap font-body text-sm text-paper">{entry.body}</p> : null}
      </div>
    );
  }

  if (entry.kind === "favorite") {
    return (
      <div className="flex flex-col gap-1">
        <span className="mt-1 font-data text-xs text-paper-muted">{t("favoriteLabel")}</span>
        <Link
          href={targetHref(entry.targetType, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="mt-1 font-data text-xs text-paper-muted">
        {t(`list.${entry.event}`)}
      </span>
      <Link
        href={`/users/${encodeURIComponent(entry.author.username)}/lists/${entry.list.id}`}
        className="font-display text-lg text-paper transition-colors hover:text-amber"
      >
        {entry.list.title}
      </Link>
    </div>
  );
}