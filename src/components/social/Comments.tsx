"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { createComment, deleteComment, getComments, updateComment } from "@/lib/api/social";
import type { CommentsResponse } from "@/lib/api/schemas";

interface CommentsProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  initial: CommentsResponse;
  authenticated: boolean;
  userId?: string;
}

export function Comments({ target, targetId, initial, authenticated, userId }: CommentsProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");
  const [comments, setComments] = useState(initial.comments);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleCreate: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    setErrorCode(null);
    try {
      const created = await createComment(target, targetId, body);
      setComments((current) => [created, ...current]);
      setBody("");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  async function handleUpdate(id: string) {
    if (!editingBody.trim()) return;
    setPending(true);
    setErrorCode(null);
    try {
      const updated = await updateComment(id, editingBody);
      setComments((current) => current.map((comment) => comment.id === id ? updated : comment));
      setEditingId(null);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteCommentConfirm"))) return;
    setPending(true);
    setErrorCode(null);
    try {
      await deleteComment(id);
      setComments((current) => current.filter((comment) => comment.id !== id));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function handleLoadMore() {
    setPending(true);
    setErrorCode(null);
    try {
      const next = await getComments(target, targetId, page + 1, initial.pageSize);
      setComments((current) => [...current, ...next.comments]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="flex w-full flex-col gap-4 border-t border-ink-border pt-6">
      <h2 id="comments-heading" className="font-display text-xl text-paper">{t("commentsHeading")}</h2>
      {authenticated ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3" aria-label={t("commentFormLabel")}>
          <label htmlFor={`comment-${target}-${targetId}`} className="font-data text-sm text-paper">{t("commentLabel")}</label>
          <textarea id={`comment-${target}-${targetId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} className="rounded border border-ink-border bg-ink-surface px-3 py-2" />
          <button type="submit" disabled={pending || !body.trim()} className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink disabled:opacity-50">{pending ? t("saving") : t("commentSubmit")}</button>
        </form>
      ) : (
        <p className="font-body text-paper-muted"><Link href="/auth/login" className="text-amber underline">{t("loginToComment")}</Link></p>
      )}
      {errorCode && <p role="alert" className="font-data text-sm text-danger">{tErrors(`${errorCode}.description`)}</p>}
      {comments.length === 0 ? <p className="font-body text-paper-muted">{t("noComments")}</p> : <ul className="flex flex-col gap-4">{comments.map((comment) => <li key={comment.id} className="rounded border border-ink-border bg-ink-surface p-4"><p className="font-data text-xs text-paper-muted">{comment.user.displayName ?? comment.user.username}</p>{editingId === comment.id ? <div className="mt-2 flex flex-col gap-2"><textarea aria-label={t("editCommentLabel")} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={5000} rows={3} className="rounded border border-ink-border bg-ink px-3 py-2" /><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => void handleUpdate(comment.id)} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink">{t("save")}</button><button type="button" onClick={() => setEditingId(null)} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">{t("cancel")}</button></div></div> : <p className="mt-2 whitespace-pre-wrap font-body text-paper">{comment.body}</p>}{userId === comment.user.id && editingId !== comment.id && <div className="mt-3 flex gap-3"><button type="button" onClick={() => { setEditingId(comment.id); setEditingBody(comment.body); }} className="font-data text-xs text-amber underline">{t("edit")}</button><button type="button" disabled={pending} onClick={() => void handleDelete(comment.id)} className="font-data text-xs text-danger underline">{t("delete")}</button></div>}</li>)}</ul>}
      {hasNext && <button type="button" disabled={pending} onClick={() => void handleLoadMore()} className="self-start rounded border border-ink-border px-4 py-2 font-display text-sm text-paper disabled:opacity-50">{pending ? t("loadingMore") : t("loadMore")}</button>}
    </section>
  );
}
