"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ProsePanel, RelativeDate, TargetTitle } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListenEntryForm } from "./ListenEntryForm";
import { ReactionBadge } from "./ReactionBadge";
import { deleteListenEntry, getMyDiary } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";

interface DiaryActivityListProps {
  initial: DiaryListResponse;
  loadMore?: (page: number, pageSize: number) => Promise<DiaryListResponse>;
  empty?: { title: string; description: string };
}

// Presentación en fila del diario propio: mismo lenguaje visual que "Tu rastro
// reciente" (riel izquierdo, título como ancla, fecha relativa), pero editable — a
// diferencia de `FeedActivityList`, que es de solo lectura en sus tres superficies.
// Cada entrada es siempre su propia fila: nunca se agrupan escuchas, porque acá hay que
// poder editar o borrar una entrada puntual (ver openspec/changes/redesign-diary,
// design.md decisiones 1 y 2).
export function DiaryActivityList({ initial, loadMore, empty }: DiaryActivityListProps) {
  const t = useTranslations("diary");
  const [entries, setEntries] = useState<ListenEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
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

  const handleDelete = async (entry: ListenEntry) => {
    setLoading(true);
    setLoadError(false);
    try {
      await deleteListenEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setPendingDeleteId(null);
      if (expandedId === entry.id) setExpandedId(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LISTEN_ENTRY_NOT_FOUND") {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
        setPendingDeleteId(null);
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
      const fetcher = loadMore ?? getMyDiary;
      const next = await fetcher(page + 1, 20);
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
    <div className="flex w-full flex-col gap-4">
      <ul className="border-l border-ink-border">
        {entries.map((entry) => {
          const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
          const expanded = expandedId === entry.id;
          const pendingDelete = pendingDeleteId === entry.id;

          return (
            <li key={entry.id} className={`${body ? "py-3" : "py-2"} pl-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 font-data text-xs text-paper-muted">
                  {t(`context.${entry.listenContext}`)}
                  {entry.reaction ? (
                    <>
                      {" · "}
                      <ReactionBadge reaction={entry.reaction} />
                    </>
                  ) : null}
                  {" · "}
                  {t(`audience.${entry.audience}`)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <RelativeDate iso={entry.createdAt} />
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
                    onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                  >
                    {expanded ? t("collapse") : t("edit")}
                  </button>
                  <span aria-hidden="true">·</span>
                  {pendingDelete ? (
                    <>
                      <span role="alert" className="font-data text-xs text-danger">
                        {loading ? t("deleting") : t("deleteConfirm")}
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        className="font-data text-xs text-danger transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleDelete(entry)}
                      >
                        {t("delete")}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        {t("collapse")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="font-data text-xs text-paper-muted transition-colors hover:text-danger"
                      onClick={() => setPendingDeleteId(entry.id)}
                    >
                      {t("delete")}
                    </button>
                  )}
                </span>
              </div>
              <div className="mt-1">
                <TargetTitle
                  href={targetHref(entry.target.type, entry.target.id)}
                  label={entry.target.title}
                  artist={null}
                  layout="inline"
                />
              </div>
              {body ? <ProsePanel body={body} /> : null}
              {expanded && (
                <div className="mt-3">
                  <ListenEntryForm
                    entryId={entry.id}
                    initial={{
                      listenContext: entry.listenContext,
                      body: entry.body,
                      reaction: entry.reaction,
                      audience: entry.audience,
                    }}
                    onCancel={() => setExpandedId(null)}
                    onSaved={(updated) => {
                      setEntries((current) =>
                        current.map((item) => (item.id === updated.id ? updated : item)),
                      );
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
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
