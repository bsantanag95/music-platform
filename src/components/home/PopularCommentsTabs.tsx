"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
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
  likeWord,
  emptyText,
}: {
  comments: PopularCommentsByType;
  tablistLabel: string;
  tabLabels: Record<TabKey, string>;
  likeWord: string;
  emptyText: string;
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
      <div role="tablist" aria-label={tablistLabel} className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
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
              className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                selected
                  ? "border-amber text-paper"
                  : "border-ink-border text-paper-muted hover:text-paper"
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
  const author = comment.authorDisplayName ?? `@${comment.authorUsername}`;

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      {/* Decorativa: el título del target va al lado como texto. */}
      <CoverThumb cover={comment.target.coverThumbUrl} label="" className="size-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={targetHref(comment.target.type, comment.target.id)}
            className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {comment.target.title}
          </Link>
          <span
            className="shrink-0 font-data text-xs text-paper-muted"
            aria-label={`${comment.likeCount} ${likeWord}`}
          >
            ♡ {comment.likeCount}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">
          <Link
            href={`/users/${encodeURIComponent(comment.authorUsername)}`}
            className="transition-colors hover:text-paper"
          >
            {author}
          </Link>
          {comment.stars != null && <span>★ {Number(comment.stars)}</span>}
        </div>
        <p className="mt-1 line-clamp-3 font-body text-sm text-paper-muted">{comment.body}</p>
      </div>
    </li>
  );
}
