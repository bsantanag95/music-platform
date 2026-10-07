"use client";

import { useId, useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { createReply, deleteComment, getReplies, updateComment } from "@/lib/api/social";
import type { CommentsResponse } from "@/lib/api/schemas";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { ContentActions } from "./ContentActions";
import { CommentLikeButton } from "./CommentLikeButton";

type Reply = CommentsResponse["comments"][number];

interface CommentThreadProps {
  /** El comentario raíz de artista cuyo hilo se muestra. */
  rootId: string;
  initialReplyCount: number;
  authenticated: boolean;
  userId?: string;
  canModerate?: boolean;
}

/**
 * Hilo de un comentario raíz de artista (openspec: add-comment-replies): respuestas de un solo
 * nivel, de la más antigua a la más reciente, cargadas al desplegarlo. Un solo formulario al final
 * responde a la raíz (no hay anidamiento ni menciones).
 */
export function CommentThread({ rootId, initialReplyCount, authenticated, userId, canModerate = false }: CommentThreadProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");
  const regionId = useId();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialReplyCount);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setErrorCode(null);
    try {
      await action();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && count > 0) {
      await run(async () => {
        const first = await getReplies(rootId, 1);
        setReplies(first.comments);
        setPage(first.page);
        setHasNext(first.hasNext);
        setLoaded(true);
      });
    }
  }

  const handleCreate: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    await run(async () => {
      const created = await createReply(rootId, body);
      setReplies((current) => [...current, created]);
      setCount((current) => current + 1);
      setBody("");
    });
  };

  const handleUpdate = (id: string) =>
    editingBody.trim()
      ? run(async () => {
          const updated = await updateComment(id, editingBody);
          setReplies((current) => current.map((reply) => (reply.id === id ? updated : reply)));
          setEditingId(null);
        })
      : Promise.resolve();

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteCommentConfirm"))) return;
    await run(async () => {
      await deleteComment(id);
      setReplies((current) => current.filter((reply) => reply.id !== id));
      setCount((current) => Math.max(0, current - 1));
    });
  }

  const handleLoadMore = () =>
    run(async () => {
      const next = await getReplies(rootId, page + 1);
      setReplies((current) => [...current, ...next.comments]);
      setPage(next.page);
      setHasNext(next.hasNext);
    });

  // Sin respuestas y sin sesión no hay nada que abrir.
  if (count === 0 && !authenticated) return null;

  const toggleLabel = open ? t("hideReplies") : count > 0 ? t("showReplies", { count }) : t("reply");

  return (
    <div className="mt-3">
      <button type="button" aria-expanded={open} aria-controls={regionId} disabled={pending} onClick={() => void toggle()} className="font-data text-xs text-amber underline disabled:opacity-50">
        {toggleLabel}
      </button>
      {open && (
        <div id={regionId} role="region" aria-label={t("repliesRegionLabel")} className="mt-3 flex flex-col gap-3 border-l-2 border-ink-border pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex flex-col gap-1">
              <div className="font-data text-xs text-paper-muted">
                {reply.user.deactivated ? (
                  <span>{t("deactivatedAccount")}</span>
                ) : (
                  <UserHoverCard username={reply.user.username}>
                    <Link href={`/users/${reply.user.username}`} className="hover:text-paper hover:underline">{reply.user.displayName ?? reply.user.username}</Link>
                  </UserHoverCard>
                )}
              </div>
              {editingId === reply.id ? (
                <div className="flex flex-col gap-2">
                  <textarea aria-label={t("editCommentLabel")} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={5000} rows={3} className="rounded border border-ink-border bg-ink px-3 py-2" />
                  <div className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => void handleUpdate(reply.id)} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink">{t("save")}</button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap font-body text-paper">{reply.body}</p>
              )}
              {editingId !== reply.id && (reply.likeCount != null || (authenticated && userId !== reply.user.id)) && (
                <CommentLikeButton commentId={reply.id} initialLiked={reply.likedByMe} initialCount={reply.likeCount} interactive={authenticated && userId !== reply.user.id} />
              )}
              {userId === reply.user.id && editingId !== reply.id && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setEditingId(reply.id); setEditingBody(reply.body); }} className="font-data text-xs text-amber underline">{t("edit")}</button>
                  <button type="button" disabled={pending} onClick={() => void handleDelete(reply.id)} className="font-data text-xs text-danger underline">{t("delete")}</button>
                </div>
              )}
              {authenticated && userId !== reply.user.id && editingId !== reply.id ? (
                <ContentActions targetType="comment" targetId={reply.id} authorUsername={reply.user.username} authorId={reply.user.id} authorDeactivated={reply.user.deactivated === true} canModerate={canModerate} onBlocked={() => setReplies((current) => current.filter((item) => item.user.id !== reply.user.id))} />
              ) : null}
            </div>
          ))}
          {hasNext && (
            <button type="button" disabled={pending} onClick={() => void handleLoadMore()} className="self-start rounded border border-ink-border px-3 py-1 font-data text-xs text-paper disabled:opacity-50">
              {pending ? t("loadingMore") : t("loadMoreReplies")}
            </button>
          )}
          {authenticated ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-2" aria-label={t("replyFormLabel")}>
              <label htmlFor={`reply-${rootId}`} className="font-data text-xs text-paper">{t("replyLabel")}</label>
              <textarea id={`reply-${rootId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={3} className="rounded border border-ink-border bg-ink-surface px-3 py-2" />
              <button type="submit" disabled={pending || !body.trim()} className="self-start rounded bg-amber px-3 py-1 font-data text-xs text-ink disabled:opacity-50">{pending ? t("saving") : t("replySubmit")}</button>
            </form>
          ) : (
            <p className="font-body text-sm text-paper-muted"><Link href="/auth/login" className="text-amber underline">{t("loginToReply")}</Link></p>
          )}
          {errorCode && <p role="alert" className="font-data text-xs text-danger">{tErrors(`${errorCode}.description`)}</p>}
        </div>
      )}
    </div>
  );
}
