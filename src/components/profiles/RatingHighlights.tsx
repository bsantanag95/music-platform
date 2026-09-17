import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { FeedRatingMeter } from "@/components/feed/FeedRatingMeter";
import { targetHref } from "@/components/feed/feed-target";
import type { RatingHighlightEntry } from "@/services/rating-highlights/rating-highlights";

interface RatingHighlightsProps {
  highlights: RatingHighlightEntry[];
}

// "Valoraciones destacadas" del perfil (spec `rating-highlights`): las
// valoraciones que el dueño eligió mostrar más allá de la regla general
// (visible solo para el dueño y sus seguidores) — curaduría consciente, igual
// criterio que los destacados y el himno. Server Component; no se renderiza
// si no hay ninguna destacada.
export async function RatingHighlights({ highlights }: RatingHighlightsProps) {
  if (highlights.length === 0) return null;
  const t = await getTranslations("users");

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("ratingHighlights.heading")}</h2>
      <ul className="flex flex-col gap-3">
        {highlights.map((highlight) => (
          <li key={highlight.id}>
            <Link
              href={targetHref(highlight.entity.type, highlight.entity.id)}
              className="group flex items-center gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
            >
              <CoverThumb cover={highlight.entity.coverThumbUrl} label="" className="size-12 rounded" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                  {highlight.entity.title}
                </span>
                {highlight.entity.artistName && (
                  <span className="block truncate font-data text-xs text-paper-muted">
                    {highlight.entity.artistName}
                  </span>
                )}
                <FeedRatingMeter
                  stars={highlight.stars}
                  detailedScore={highlight.detailedScore}
                  label={
                    highlight.detailedScore != null
                      ? t("reviews.ratingLabelScore", { stars: highlight.stars, score: highlight.detailedScore })
                      : t("reviews.ratingLabel", { stars: highlight.stars })
                  }
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
