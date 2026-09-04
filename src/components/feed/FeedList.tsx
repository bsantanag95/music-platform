"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedActivityList } from "./FeedActivityList";
import { getFeed } from "@/lib/api/diary";
import type { FeedEntry, FeedResponse } from "@/lib/api/schemas";

interface FeedListProps {
  initial: FeedResponse;
  empty?: { title: string; description: string };
}

// Feed de actividad: escuchas, favoritos, eventos de listas, ratings y
// comentarios de los usuarios seguidos. Cada tipo de entrada se renderiza
// según su `kind` con jerarquía visual: las entradas con texto (escucha con
// impresión, comentario) tienen más peso.
export function FeedList({ initial, empty }: FeedListProps) {
  const t = useTranslations("feed");
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
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <FeedActivityList entries={entries} />
      {loadError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
      {hasNext && (
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void handleLoadMore()}
          className="self-center"
        >
          {loading ? t("loadingMore") : loadError ? t("retry") : t("loadMore")}
        </Button>
      )}
    </div>
  );
}
