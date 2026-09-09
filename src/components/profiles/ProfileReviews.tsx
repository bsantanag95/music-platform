import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { FeedRatingMeter } from "@/components/feed/FeedRatingMeter";
import type { ProfileReview } from "@/services/profiles/reviews";

interface ProfileReviewsProps {
  data: { reviews: ProfileReview[]; total: number } | null;
}

// Sección "Reseñas" del perfil (openspec: add-profile-featured-reviews): las
// reseñas de álbum más recientes del dueño, en el clúster de identidad cultural
// (después de destacados, antes de "En rotación"). Automática, no curada — no
// hay control de fijar. Cada tarjeta enlaza al álbum, donde vive la reseña
// completa. Server Component; no se renderiza si no hay acceso o no hay reseñas.
export async function ProfileReviews({ data }: ProfileReviewsProps) {
  if (!data || data.reviews.length === 0) return null;

  const t = await getTranslations("users");
  const remainder = data.total - data.reviews.length;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("reviews.title")}</h2>

      <ul className="flex flex-col gap-3">
        {data.reviews.map((entry) => (
          <li
            key={entry.id}
            className="flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-4 sm:gap-4"
          >
            <Link href={`/album/${entry.album.id}`} className="group shrink-0">
              <CoverThumb
                cover={entry.album.coverThumbUrl}
                label=""
                className="size-14 rounded-md border border-ink-border transition-colors group-hover:border-amber sm:size-16"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link
                  href={`/album/${entry.album.id}`}
                  className="truncate font-display text-base text-paper underline decoration-ink-border decoration-1 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
                >
                  {entry.album.title}
                </Link>
                {entry.album.artistName ? (
                  <span className="truncate font-data text-xs text-paper-muted">
                    {entry.album.artistName}
                  </span>
                ) : null}
              </div>
              {entry.stars ? (
                <FeedRatingMeter
                  stars={entry.stars}
                  detailedScore={entry.detailedScore}
                  label={
                    entry.detailedScore != null
                      ? t("reviews.ratingLabelScore", {
                          stars: entry.stars,
                          score: entry.detailedScore,
                        })
                      : t("reviews.ratingLabel", { stars: entry.stars })
                  }
                />
              ) : null}
              {entry.title ? (
                <p className="mt-0.5 font-display text-sm text-paper">{entry.title}</p>
              ) : null}
              <p className="line-clamp-4 whitespace-pre-wrap font-body text-sm text-paper-muted">
                {entry.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {remainder > 0 ? (
        <p className="font-data text-xs text-paper-muted">
          {t("reviews.andMore", { count: remainder })}
        </p>
      ) : null}
    </section>
  );
}
