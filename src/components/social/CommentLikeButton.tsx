"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { likeComment, unlikeComment } from "@/lib/api/social";

interface CommentLikeButtonProps {
  commentId: string;
  initialLiked: boolean;
  /** Cifra visible: `null` bajo el umbral (add-comment-likes). */
  initialCount: number | null;
  /** Falso para anónimos y para el autor: ven la cifra, sin botón. */
  interactive: boolean;
}

// Like de un comentario con estado optimista: el botón cambia al instante y se
// revierte con el código de error si falla. La cifra solo la fija la respuesta
// del servidor (ya umbralizada), así el número real bajo el umbral no se filtra.
export function CommentLikeButton({ commentId, initialLiked, initialCount, interactive }: CommentLikeButtonProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const figure = count != null ? <span aria-label={t("likesCount", { count })}>{count}</span> : null;

  if (!interactive) {
    return figure ? (
      <span className="font-data text-xs text-paper-muted">
        <span aria-hidden="true">♡</span> {figure}
      </span>
    ) : null;
  }

  async function toggle() {
    const previous = liked;
    setLiked(!previous);
    setPending(true);
    setErrorCode(null);
    try {
      const result = await (previous ? unlikeComment(commentId) : likeComment(commentId));
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch (error) {
      setLiked(previous);
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? t("unlikeComment") : t("likeComment")}
        disabled={pending}
        onClick={() => void toggle()}
        className={`font-data text-xs transition-colors disabled:opacity-50 ${liked ? "text-amber" : "text-paper-muted hover:text-paper"}`}
      >
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        {figure ? <> {figure}</> : null}
      </button>
      {errorCode && <span role="alert" className="font-data text-xs text-danger">{tErrors(`${errorCode}.description`)}</span>}
    </span>
  );
}
