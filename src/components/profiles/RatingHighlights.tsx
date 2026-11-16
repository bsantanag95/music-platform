import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { formatStars } from "@/components/album/album-format";
import { targetHref } from "@/components/feed/feed-target";
import { ProfileSectionHeading } from "./ProfileSectionHeading";
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
  const [t, locale] = await Promise.all([getTranslations("users"), getLocale()]);

  return (
    <section className="flex w-full flex-col gap-4">
      <ProfileSectionHeading title={t("ratingHighlights.heading")} />
      <ul className="flex flex-col divide-y divide-ink-border">
        {highlights.map((highlight) => (
          <li key={highlight.id} className="py-3 first:pt-0 last:pb-0">
            <Link
              href={targetHref(
                highlight.entity.type,
                highlight.entity.id,
                highlight.entity.title,
                highlight.entity.artistName ?? null,
              )}
              className="group flex items-center gap-3"
            >
              <CoverThumb
                cover={highlight.entity.coverThumbUrl}
                label=""
                className="size-14 rounded border border-ink-border transition-colors group-hover:border-amber"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                  {highlight.entity.title}
                </span>
                {highlight.entity.artistName && (
                  <span className="block truncate font-data text-xs text-paper-muted">
                    {highlight.entity.artistName}
                  </span>
                )}
                <StarRatingValue
                  stars={highlight.stars}
                  detailedScore={highlight.detailedScore}
                  showScore
                  label={
                    highlight.detailedScore != null
                      ? t("reviews.ratingLabelScore", {
                          stars: formatStars(Number(highlight.stars), locale),
                          score: highlight.detailedScore,
                        })
                      : t("reviews.ratingLabel", { stars: formatStars(Number(highlight.stars), locale) })
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
