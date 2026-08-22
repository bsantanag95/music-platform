"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListenEntryForm } from "./ListenEntryForm";
import { ReactionBadge } from "./ReactionBadge";
import { deleteListenEntry, getMyDiary } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { DiaryListResponse, ListenEntry, ListenTargetInfo } from "@/lib/api/schemas";

interface DiaryListProps {
  initial: DiaryListResponse;
}

function targetHref(target: ListenTargetInfo): string {
  if (target.type === "artist") return `/artist/${target.id}`;
  if (target.type === "release-group") return `/album/${target.id}`;
  return `/song/${target.id}`;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Listado paginado del diario propio. Cada entrada permite ampliarse
// (impresión/contexto/reacción/audiencia) y borrarse con confirmación;
// solo se listan entradas del usuario autenticado.
export function DiaryList({ initial }: DiaryListProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const [entries, setEntries] = useState<ListenEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (entries.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
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
      const next = await getMyDiary(page + 1, 20);
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
          <li key={entry.id} className="rounded border border-ink-border bg-ink-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={targetHref(entry.target)}
                  className="font-display text-lg text-paper transition-colors hover:text-amber"
                >
                  {entry.target.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                  <span>{t(`context.${entry.listenContext}`)}</span>
                  <ReactionBadge reaction={entry.reaction} />
                  <span>{t(`audience.${entry.audience}`)}</span>
                  <time dateTime={entry.createdAt}>{formatDate(entry.createdAt, locale)}</time>
                </div>
                {entry.body ? <p className="mt-2 whitespace-pre-wrap font-body text-paper">{entry.body}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Button variant="ghost" onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}>
                  {expandedId === entry.id ? t("collapse") : t("expand")}
                </Button>
                {pendingDeleteId === entry.id ? (
                  <div className="flex items-center gap-2">
                    <span className="font-data text-xs text-danger">{t("deleteConfirm")}</span>
                    <Button variant="primary" disabled={loading} onClick={() => void handleDelete(entry)}>
                      {loading ? t("deleting") : t("delete")}
                    </Button>
                    <Button variant="ghost" disabled={loading} onClick={() => setPendingDeleteId(null)}>
                      {t("collapse")}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setPendingDeleteId(entry.id)}>
                    {t("delete")}
                  </Button>
                )}
              </div>
            </div>
            {expandedId === entry.id && (
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