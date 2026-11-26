"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { targetHref } from "@/components/feed/feed-target";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { FEED_KIND_ICONS } from "@/components/feed/FeedKindIcons";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { CommentTopicLabel } from "@/components/social/CommentTopicLabel";
import { reviewHref } from "@/lib/catalog-links";
import { compactRatingValue } from "./compact-rating";
import type { CompactActivityEntry } from "@/components/feed/CompactActivityRow";
import type { FeedFavorite, FeedListenEntry } from "@/lib/api/schemas";

type FeedAuthor = FeedListenEntry["author"];

export { compactRatingValue };

/** Racha de escuchas de una persona en una sola tarjeta (openspec: redesign-signed-in-home-phase2). */
export interface ActivityCardListenRun {
  kind: "listen-run";
  id: string;
  author: FeedAuthor;
  createdAt: string;
  entries: FeedListenEntry[];
}

export type ActivityCardEntry = CompactActivityEntry | FeedListenEntry | FeedFavorite | ActivityCardListenRun;

/** Carátulas del abanico de una racha. */
const RUN_COVERS = 4;

// Tarjeta de actividad (openspec: redesign-anon-home-phase2; con sesión, redesign-signed-in-home-phase2):
// autor, objetivo, nota compacta o tipo de texto, fecha y extracto, con la carátula grande y el extracto en
// primer plano, para que la actividad se lea como lo que escuchan y opinan personas. Además de valoración,
// comentario y reseña (comunidad), admite escucha, favorito de álbum y racha de escuchas (feed de quienes
// sigues). `wide` ocupa dos columnas de la rejilla (la entrada más reciente). Cliente por `RelativeDate` y
// `UserHoverCard`; sin acciones.
export function ActivityCard({ entry, wide = false }: { entry: ActivityCardEntry; wide?: boolean }) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;
  const coverSize = wide ? "size-20 sm:size-24" : "size-16 sm:size-20";

  // Objetivo único (todas salvo la racha).
  const single = entry.kind === "listen-run" ? null : entry;
  const target = single
    ? single.kind === "favorite"
      ? { type: single.targetType, ...single.target }
      : single.target
    : null;

  const isReview = entry.kind === "review";
  const body =
    entry.kind === "comment" || entry.kind === "review" || entry.kind === "listen" ? (entry.body?.trim() || null) : null;
  const icon = entry.kind === "listen-run" ? FEED_KIND_ICONS.listen : FEED_KIND_ICONS[entry.kind];
  const textLabel =
    entry.kind === "comment"
      ? t("commentLabel")
      : entry.kind === "review"
        ? entry.title
          ? t("reviewVerbTitled", { title: entry.title })
          : t("reviewVerb")
        : entry.kind === "listen"
          ? t(`context.${entry.listenContext}`)
          : entry.kind === "favorite"
            ? t("favoriteLabel")
            : entry.kind === "listen-run"
              ? t("groupListens", { count: entry.entries.length })
              : null;

  return (
    <li className={wide ? "sm:col-span-2" : undefined}>
      <article className="flex h-full gap-4 rounded-xl border border-ink-border bg-ink p-4 transition-colors hover:border-paper-muted/40">
        {entry.kind === "listen-run" ? (
          // Mosaico 2×2 de las carátulas de la racha (como el de las listas), decorativo: los títulos van al lado.
          <span aria-hidden className={`shrink-0 ${coverSize}`}>
            <span className="grid h-full w-full grid-cols-2 gap-0.5 overflow-hidden rounded-md ring-1 ring-ink-border">
              {entry.entries.slice(0, RUN_COVERS).map((listen) => (
                <CoverThumb key={listen.id} cover={listen.target.coverThumbUrl} label="" className="h-full w-full rounded-none" />
              ))}
            </span>
          </span>
        ) : (
          <CoverThumb cover={target!.coverThumbUrl} label="" className={`rounded-md ring-1 ring-ink-border ${coverSize}`} />
        )}
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
          {target ? (
            <p className="truncate">
              <Link
                href={targetHref(target.type, target.id, target.title, target.artistName ?? null)}
                className="font-display text-base text-paper transition-colors hover:text-amber"
              >
                {target.title}
              </Link>
              {target.artistName ? (
                <span className="font-body text-sm text-paper-muted">
                  {" · "}
                  <ArtistName name={target.artistName} id={target.artistId} />
                </span>
              ) : null}
            </p>
          ) : null}
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
          {entry.kind === "listen-run" ? (
            <ul className="mt-0.5 flex min-w-0 flex-col gap-0.5">
              {entry.entries.slice(0, RUN_COVERS).map((listen) => (
                <li key={listen.id} className="truncate">
                  <Link
                    href={targetHref(listen.target.type, listen.target.id, listen.target.title, listen.target.artistName ?? null)}
                    className="font-display text-sm text-paper transition-colors hover:text-amber"
                  >
                    {listen.target.title}
                  </Link>
                  {listen.target.artistName ? (
                    <span className="font-body text-xs text-paper-muted">
                      {" · "}
                      <ArtistName name={listen.target.artistName} id={listen.target.artistId} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {body ? (
            <p
              className={`mt-1 font-body text-sm leading-relaxed text-paper-muted ${wide ? "line-clamp-3" : "line-clamp-2"}`}
            >
              {body}
            </p>
          ) : null}
          {entry.kind === "review" ? (
            // La tarjeta muestra solo un extracto: la reseña completa (y sus comentarios) está en su página.
            <Link
              href={reviewHref(entry.author.username, entry.target.title, entry.id)}
              className="mt-1 w-fit font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-amber"
            >
              {t("community.readReview")}
            </Link>
          ) : null}
        </div>
      </article>
    </li>
  );
}

// Nombre del artista acreditado: enlaza a su página cuando la entrada trae su id (`artistId` viene nulo cuando
// el objetivo ya es el artista, y entonces el título ya enlaza ahí).
function ArtistName({ name, id }: { name: string; id: string | null | undefined }) {
  if (!id) return <>{name}</>;
  return (
    <Link href={targetHref("artist", id, name)} className="transition-colors hover:text-paper">
      {name}
    </Link>
  );
}
