import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { formatStars } from "@/components/album/album-format";
import { targetHref } from "@/components/feed/feed-target";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import { RelistenButton } from "./RelistenButton";
import type { FeedComment, FeedListenEntry, FeedRating, FeedReview } from "@/services/feed/feed";

export type LastTouch = FeedListenEntry | FeedRating | FeedComment | FeedReview;

/** Valoración propia del objetivo, en la forma del servicio (`stars` "0.5".."5.0"). */
export interface OwnRating {
  stars: string;
  detailedScore: number | null;
}

interface LastTouchCardProps {
  entry: LastTouch;
  rating: OwnRating | null;
}

// «Última vez» de la cabecera de Inicio (openspec: redesign-signed-in-home-phase1): la entrada más
// reciente del rastro propio con objetivo de catálogo, en grande —carátula, título, artista, tu
// valoración en forma de fila (`rating-display`) y la fecha—. No es un enlace entero porque lleva
// dos acciones: volver a anotarla (con confirmación) e ir a la entidad.
export async function LastTouchCard({ entry, rating }: LastTouchCardProps) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const { target } = entry;
  const when = await relativeFeedDate(entry.createdAt);
  const subtitle = target.artistName ?? null;
  const viewKey =
    target.type === "release-group" ? "lastTouchViewAlbum" : target.type === "recording" ? "lastTouchViewSong" : "lastTouchViewArtist";

  const starsText = rating ? formatStars(Number(rating.stars), locale) : "";
  const ratingLabel = rating
    ? rating.detailedScore != null
      ? t("lastTouchRatingScore", { stars: starsText, score: rating.detailedScore })
      : t("lastTouchRatingStars", { stars: starsText })
    : "";

  return (
    <article
      aria-labelledby="home-last-touch-title"
      className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-ink-border bg-ink-surface/95 p-3.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md sm:grid-cols-[11.25rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
    >
      <CoverThumb
        cover={target.coverThumbUrl}
        label=""
        priority
        className="size-[6.5rem] rounded-lg shadow-lg shadow-black/50 sm:size-[11.25rem]"
      />
      <div className="min-w-0">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
          {t("lastTouchEyebrow")}
          <span aria-hidden="true" className="mx-1.5 text-ink-border">
            ·
          </span>
          <span className="normal-case tracking-normal">{when}</span>
        </p>
        <h2
          id="home-last-touch-title"
          className="mt-1.5 line-clamp-2 font-display text-xl font-bold leading-tight tracking-tight text-paper sm:text-2xl"
        >
          {target.title}
        </h2>
        {subtitle ? <p className="truncate font-body text-base text-paper-muted">{subtitle}</p> : null}
        {rating ? (
          <div className="[&>span>span:last-child]:text-sm">
            <StarRatingValue
              stars={rating.stars}
              detailedScore={rating.detailedScore}
              label={ratingLabel}
              starClassName="size-4"
              showScore
            />
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
          <RelistenButton
            target={{ type: target.type, id: target.id, title: target.title, subtitle }}
            label={t("lastTouchRelisten")}
          />
          <Link
            href={targetHref(target.type, target.id, target.title, target.artistName ?? null)}
            className="inline-flex min-h-11 items-center rounded-md px-3 font-display text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t(viewKey)}
          </Link>
        </div>
      </div>
    </article>
  );
}
