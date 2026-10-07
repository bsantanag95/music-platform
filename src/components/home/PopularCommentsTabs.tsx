"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import { formatStars } from "@/components/album/album-format";
import { CommentTopicLabel } from "@/components/social/CommentTopicLabel";
import type { PopularComment, PopularCommentsByType } from "@/services/home/home";

type TabKey = "artist" | "release-group" | "recording";

const TAB_ORDER: TabKey[] = ["artist", "release-group", "recording"];

// Control segmentado de "Comentarios populares": un solo espacio, se cambia
// entre Artistas / Álbumes / Canciones con botones (ARIA tabs). Client
// component por el estado de pestaña activa.
export function PopularCommentsTabs({
  comments,
  tablistLabel,
  tabLabels,
  emptyText,
  likeWord,
}: {
  comments: PopularCommentsByType;
  tablistLabel: string;
  tabLabels: Record<TabKey, string>;
  emptyText: string;
  /** Palabra para el texto accesible de la cifra ("me gusta"). */
  likeWord: string;
}) {
  const baseId = useId();
  // Se muestran las tres pestañas siempre; la que arranca activa es la primera
  // con contenido, y una pestaña vacía cae en su empty state.
  const firstWithContent = TAB_ORDER.find((key) => comments[key].length > 0) ?? "artist";
  const [active, setActive] = useState<TabKey>(firstWithContent);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = TAB_ORDER.indexOf(active);
    const next =
      e.key === "ArrowRight"
        ? TAB_ORDER[(i + 1) % TAB_ORDER.length]!
        : TAB_ORDER[(i - 1 + TAB_ORDER.length) % TAB_ORDER.length]!;
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const rows = comments[active];

  return (
    <div className="flex flex-col gap-4">
      {/* Control segmentado: una sola pieza con la opción activa rellena, en vez
          de tres botones sueltos que se leían como filtros independientes. */}
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="inline-flex w-fit gap-1 rounded-md border border-ink-border bg-ink-surface p-1"
        onKeyDown={onKeyDown}
      >
        {TAB_ORDER.map((key) => {
          const selected = key === active;
          return (
            <button
              key={key}
              id={`${baseId}-tab-${key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(key)}
              className={`rounded px-3 py-1.5 font-data text-xs transition-colors duration-150 ${
                selected
                  ? "bg-ink text-amber shadow-sm shadow-black/40"
                  : "text-paper-muted hover:text-paper"
              }`}
            >
              {tabLabels[key]}
            </button>
          );
        })}
      </div>

      <ul
        id={`${baseId}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="flex flex-col divide-y divide-ink-border"
      >
        {rows.length === 0 ? (
          <li className="py-4 font-body text-sm text-paper-muted">{emptyText}</li>
        ) : (
          rows.map((comment) => (
            <CommentRow key={comment.id} comment={comment} likeWord={likeWord} />
          ))
        )}
      </ul>
    </div>
  );
}

function CommentRow({ comment, likeWord }: { comment: PopularComment; likeWord: string }) {
  const locale = useLocale();
  const author = comment.authorDisplayName ?? `@${comment.authorUsername}`;
  // Forma compacta `★ 86/100` con puntaje detallado, `★ 4,5` sin él (rating-display).
  const score =
    comment.stars == null
      ? null
      : comment.detailedScore != null
        ? `${comment.detailedScore}/100`
        : formatStars(Number(comment.stars), locale);

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      {/* Decorativa: el título del target va al lado como texto. */}
      <CoverThumb
        cover={comment.target.coverThumbUrl}
        label=""
        className="size-12 shadow-sm shadow-black/40 ring-1 ring-ink-border"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link
            href={targetHref(comment.target.type, comment.target.id, comment.target.title)}
            className="truncate font-display text-base text-paper transition-colors hover:text-amber"
          >
            {comment.target.title}
          </Link>
          <CommentTopicLabel
            topic={comment.topic}
            className="shrink-0 rounded-full border border-ink-border px-2 py-0.5 font-data text-xs text-paper-muted"
          />
          {/* Cifra real desde 3 likes (null bajo el umbral); anónima, sin quién likeó. */}
          {comment.likeCount != null ? (
            <span
              aria-label={`${comment.likeCount} ${likeWord}`}
              className="ml-auto shrink-0 rounded-full border border-ink-border px-2 py-0.5 font-data text-xs text-paper-muted"
            >
              <span aria-hidden="true">♡ {comment.likeCount}</span>
            </span>
          ) : null}
        </div>
        {/* El comentario es el protagonista del bloque: va en tono principal,
            como cita con borde, y el autor lo firma debajo. */}
        <p className="mt-1.5 line-clamp-3 border-l-2 border-ink-border pl-3 font-body text-sm text-paper">
          {comment.body}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 pl-3 font-data text-xs text-paper-muted">
          <span aria-hidden="true">—</span>
          <Link
            href={`/users/${encodeURIComponent(comment.authorUsername)}`}
            className="transition-colors hover:text-amber"
          >
            {author}
          </Link>
          {score != null ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                <span className="text-amber">★</span> <span className="font-medium text-paper">{score}</span>
              </span>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
