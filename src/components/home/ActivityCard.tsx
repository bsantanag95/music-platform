"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { targetHref } from "@/components/feed/feed-target";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { FEED_KIND_ICONS } from "@/components/feed/FeedKindIcons";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { CommentTopicLabel } from "@/components/social/CommentTopicLabel";
import { formatStars } from "@/components/album/album-format";
import type { CompactActivityEntry } from "@/components/feed/CompactActivityRow";

/**
 * Nota en la forma compacta que `rating-display` fija para la actividad de la comunidad: `86/100` si la
 * valoración tiene puntaje detallado, el número de estrellas si no — nunca ambos.
 */
export function compactRatingValue(stars: string, detailedScore: number | null, locale: string): string {
  return detailedScore != null ? `${detailedScore}/100` : formatStars(Number(stars), locale);
}

// Tarjeta de actividad de la portada sin sesión (openspec: redesign-anon-home-phase2): la misma
// información que `CompactActivityRow` —autor, nota compacta o tipo de texto, objetivo, fecha y
// extracto— con la carátula grande y el extracto en primer plano, para que la comunidad se lea como
// reseñas de personas. `wide` ocupa las dos columnas de la rejilla (la entrada más reciente). Cliente
// por `RelativeDate` y `UserHoverCard`; sin acciones.
export function ActivityCard({ entry, wide = false }: { entry: CompactActivityEntry; wide?: boolean }) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;
  const isReview = entry.kind === "review";
  const body = entry.kind === "comment" || entry.kind === "review" ? entry.body : null;
  const icon = entry.kind === "comment" || entry.kind === "review" ? FEED_KIND_ICONS[entry.kind] : null;
  const textLabel =
    entry.kind === "comment"
      ? t("commentLabel")
      : entry.kind === "review"
        ? entry.title
          ? t("reviewVerbTitled", { title: entry.title })
          : t("reviewVerb")
        : null;

  return (
    <li className={wide ? "sm:col-span-2" : undefined}>
      <article className="flex h-full gap-4 rounded-xl border border-ink-border bg-ink p-4 transition-colors hover:border-paper-muted/40">
        <CoverThumb
          cover={entry.target.coverThumbUrl}
          label=""
          className={`rounded-md ring-1 ring-ink-border ${wide ? "size-20 sm:size-24" : "size-16 sm:size-20"}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 font-data text-xs text-paper-muted">
            <UserHoverCard username={username}>
              <Link
                href={`/users/${encodeURIComponent(username)}`}
                className="min-w-0 truncate text-paper transition-colors hover:text-amber"
              >
                {authorLabel}
              </Link>
            </UserHoverCard>
            <RelativeDate iso={entry.createdAt} />
          </div>
          <p className="truncate">
            <Link
              href={targetHref(entry.target.type, entry.target.id, entry.target.title, entry.target.artistName ?? null)}
              className="font-display text-base text-paper transition-colors hover:text-amber"
            >
              {entry.target.title}
            </Link>
            {entry.target.artistName ? (
              <span className="font-body text-sm text-paper-muted"> · {entry.target.artistName}</span>
            ) : null}
          </p>
          {entry.kind === "rating" ? (
            <p className="font-data text-sm">
              <span aria-hidden="true" className="text-amber">
                ★
              </span>{" "}
              <span className="font-medium text-paper">
                {compactRatingValue(entry.stars, entry.detailedScore, locale)}
              </span>
            </p>
          ) : (
            <p className={`flex min-w-0 items-baseline gap-1.5 font-data text-xs ${isReview ? "text-petrol" : "text-paper-muted"}`}>
              {icon ? (
                <span aria-hidden="true" className="inline-flex translate-y-px self-center">
                  {icon}
                </span>
              ) : null}
              <span className="truncate">{textLabel}</span>
              {entry.kind === "comment" && entry.topic ? (
                <>
                  <span aria-hidden="true">·</span>
                  <CommentTopicLabel topic={entry.topic} className="shrink-0" />
                </>
              ) : null}
            </p>
          )}
          {body ? (
            <p
              className={`mt-1 font-body text-sm leading-relaxed text-paper-muted ${wide ? "line-clamp-3" : "line-clamp-2"}`}
            >
              {body}
            </p>
          ) : null}
        </div>
      </article>
    </li>
  );
}
