"use client";

import { useRef, useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { createComment, deleteComment, getComments, updateComment } from "@/lib/api/social";
import type { CommentTopic, CommentsResponse } from "@/lib/api/schemas";
import { ContentActions } from "./ContentActions";
import { CommentLikeButton } from "./CommentLikeButton";
import { CommentTopicLabel } from "./CommentTopicLabel";
import { CommentThread } from "./CommentThread";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";

/** Mismo catálogo que `COMMENT_TOPICS` (`@/db/schema`), sin arrastrar la base al cliente. */
const TOPICS: readonly CommentTopic[] = ["start", "albums", "songs", "general"];
const DEFAULT_TOPIC: CommentTopic = "general";

interface CommentsProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  initial: CommentsResponse;
  authenticated: boolean;
  userId?: string;
  /**
   * Activa los temas (openspec: add-artist-comment-topics): chips de filtro, selector de tema al
   * escribir y etiqueta de tema en cada comentario. Solo la página de artista; Álbum y Canción
   * no lo pasan y no cambian.
   */
  topics?: boolean;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate?: boolean;
}

export function Comments({
  target,
  targetId,
  initial,
  authenticated,
  userId,
  topics = false,
  canModerate = false,
}: CommentsProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");
  const [comments, setComments] = useState(initial.comments);
  // Filtro activo (`null` = todos) y tema del formulario: arranca en `general`, o en el tema del
  // chip activo (add-artist-comment-topics, D8).
  const [activeTopic, setActiveTopic] = useState<CommentTopic | null>(null);
  const [composeTopic, setComposeTopic] = useState<CommentTopic>(DEFAULT_TOPIC);
  // Descarta la respuesta de un filtro anterior si el usuario cambia de chip rápido.
  const filterRequest = useRef(0);
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
      const created = await createComment(target, targetId, body, topics ? composeTopic : undefined);
      if (topics && activeTopic && created.topic !== activeTopic) {
        // El comentario cae en otro tema que el filtro activo: se pasa a ese tema para que se vea.
        await applyFilter(created.topic);
      } else {
        setComments((current) => [created, ...current]);
      }
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

  /** Cambia el filtro (`null` = todos) y reemplaza la lista con la primera página de ese tema. */
  async function applyFilter(topic: CommentTopic | null) {
    const request = ++filterRequest.current;
    setActiveTopic(topic);
    if (topic) setComposeTopic(topic);
    setPending(true);
    setErrorCode(null);
    try {
      const first = await getComments(target, targetId, 1, initial.pageSize, topic ?? undefined);
      if (request !== filterRequest.current) return;
      setComments(first.comments);
      setPage(first.page);
      setHasNext(first.hasNext);
    } catch (error) {
      if (request !== filterRequest.current) return;
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      if (request === filterRequest.current) setPending(false);
    }
  }

  async function handleLoadMore() {
    setPending(true);
    setErrorCode(null);
    try {
      const next = await getComments(target, targetId, page + 1, initial.pageSize, activeTopic ?? undefined);
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
      {topics && (
        <div role="group" aria-label={t("topicFilterLabel")} className="flex flex-wrap gap-2">
          {[null, ...TOPICS].map((topic) => (
            <button key={topic ?? "all"} type="button" aria-pressed={activeTopic === topic} disabled={pending} onClick={() => void applyFilter(topic)} className={`rounded-full border px-3 py-1 font-data text-xs disabled:opacity-50 ${activeTopic === topic ? "border-amber bg-amber text-ink" : "border-ink-border text-paper hover:border-amber"}`}>{topic ? t(`topics.${topic}`) : t("topicAll")}</button>
          ))}
        </div>
      )}
      {authenticated ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3" aria-label={t("commentFormLabel")}>
          <label htmlFor={`comment-${target}-${targetId}`} className="font-data text-sm text-paper">{t("commentLabel")}</label>
          <textarea id={`comment-${target}-${targetId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} className="rounded border border-ink-border bg-ink-surface px-3 py-2" />
          {topics && (
            <div className="flex items-center gap-2">
              <label htmlFor={`comment-topic-${target}-${targetId}`} className="font-data text-sm text-paper">{t("topicSelectLabel")}</label>
              <select id={`comment-topic-${target}-${targetId}`} value={composeTopic} onChange={(event) => setComposeTopic(event.target.value as CommentTopic)} className="rounded border border-ink-border bg-ink-surface px-2 py-1 font-data text-sm text-paper">
                {TOPICS.map((topic) => <option key={topic} value={topic}>{t(`topics.${topic}`)}</option>)}
              </select>
            </div>
          )}
          <button type="submit" disabled={pending || !body.trim()} className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink disabled:opacity-50">{pending ? t("saving") : t("commentSubmit")}</button>
        </form>
      ) : (
        <p className="font-body text-paper-muted"><Link href="/auth/login" className="text-amber underline">{t("loginToComment")}</Link></p>
      )}
      {errorCode && <p role="alert" className="font-data text-sm text-danger">{tErrors(`${errorCode}.description`)}</p>}
      {comments.length === 0 ? <p className="font-body text-paper-muted">{topics && activeTopic ? t(`topicEmpty.${activeTopic}`) : t("noComments")}</p> : <ul className="flex flex-col gap-4">{comments.map((comment) => <li key={comment.id} className="rounded border border-ink-border bg-ink-surface p-4"><div className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">{comment.user.deactivated ? <span>{t("deactivatedAccount")}</span> : <UserHoverCard username={comment.user.username}><Link href={`/users/${comment.user.username}`} className="hover:text-paper hover:underline">{comment.user.displayName ?? comment.user.username}</Link></UserHoverCard>}{topics && comment.topic ? <><span aria-hidden="true">·</span><CommentTopicLabel topic={comment.topic} /></> : null}</div>{editingId === comment.id ? <div className="mt-2 flex flex-col gap-2"><textarea aria-label={t("editCommentLabel")} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={5000} rows={3} className="rounded border border-ink-border bg-ink px-3 py-2" /><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => void handleUpdate(comment.id)} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink">{t("save")}</button><button type="button" onClick={() => setEditingId(null)} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">{t("cancel")}</button></div></div> : <p className="mt-2 whitespace-pre-wrap font-body text-paper">{comment.body}</p>}{editingId !== comment.id && (comment.likeCount != null || (authenticated && userId !== comment.user.id)) && <div className="mt-3"><CommentLikeButton commentId={comment.id} initialLiked={comment.likedByMe} initialCount={comment.likeCount} interactive={authenticated && userId !== comment.user.id} /></div>}{userId === comment.user.id && editingId !== comment.id && <div className="mt-3 flex gap-3"><button type="button" onClick={() => { setEditingId(comment.id); setEditingBody(comment.body); }} className="font-data text-xs text-amber underline">{t("edit")}</button><button type="button" disabled={pending} onClick={() => void handleDelete(comment.id)} className="font-data text-xs text-danger underline">{t("delete")}</button></div>}{authenticated && userId !== comment.user.id && editingId !== comment.id ? <ContentActions targetType="comment" targetId={comment.id} authorUsername={comment.user.username} authorId={comment.user.id} authorDeactivated={comment.user.deactivated === true} canModerate={canModerate} onBlocked={() => setComments((current) => current.filter((item) => item.user.id !== comment.user.id))} /> : null}{topics && editingId !== comment.id ? <CommentThread rootId={comment.id} initialReplyCount={comment.replyCount} authenticated={authenticated} userId={userId} canModerate={canModerate} /> : null}</li>)}</ul>}
      {hasNext && <button type="button" disabled={pending} onClick={() => void handleLoadMore()} className="self-start rounded border border-ink-border px-4 py-2 font-display text-sm text-paper disabled:opacity-50">{pending ? t("loadingMore") : t("loadMore")}</button>}
    </section>
  );
}
