import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContentActions } from "@/components/social/ContentActions";
import type { ReviewDetail } from "@/services/reviews";

// Cuerpo de una reseña de álbum (openspec: redesign-album-page, capability `review-detail`),
// compartido por la página `/review/{id}` y su modal interceptado desde el álbum.

interface ReviewArticleProps {
  detail: ReviewDetail;
  /** Visitante autenticado: puede reportar o bloquear si la reseña no es suya. */
  viewerId: string | null;
  canModerate: boolean;
  /** El modal ya muestra el título como encabezado del diálogo. */
  showTitle?: boolean;
}

export function ReviewArticle({ detail, viewerId, canModerate, showTitle = true }: ReviewArticleProps) {
  const t = useTranslations("catalog.album.reviewPage");
  const tSocial = useTranslations("catalog.social");
  const format = useFormatter();
  const { review, album } = detail;
  const deactivated = review.user.deactivated === true;
  const author = deactivated ? tSocial("deactivatedAccount") : (review.user.displayName ?? review.user.username);

  return (
    <article className="flex flex-col gap-4">
      <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
        <Link href={`/album/${album.id}`} className="hover:text-paper hover:underline">
          {t("reviewOf", { album: album.title })}
        </Link>
      </p>
      {showTitle &&
        (review.title ? (
          <h1 className="font-display text-2xl text-paper">{review.title}</h1>
        ) : (
          <h1 className="sr-only">{t("reviewOf", { album: album.title })}</h1>
        ))}
      <p className="flex flex-wrap items-baseline gap-x-3 font-data text-xs text-paper-muted">
        <span>
          {t("byPrefix")}{" "}
          {deactivated ? (
            author
          ) : (
            <Link href={`/users/${review.user.username}`} className="text-paper hover:underline">
              {author}
            </Link>
          )}
        </span>
        {review.rating && (
          <span className="text-amber">
            <span aria-hidden="true">
              {"★".repeat(Math.floor(review.rating.stars))}
              {review.rating.stars % 1 ? "½" : ""}
            </span>
            <span className="sr-only">{review.rating.stars}</span>
          </span>
        )}
        <time dateTime={review.createdAt}>{format.dateTime(new Date(review.createdAt), { dateStyle: "long" })}</time>
      </p>
      <p className="whitespace-pre-wrap font-body text-paper">{review.body}</p>
      {viewerId && viewerId !== review.user.id && (
        <ContentActions
          targetType="review"
          targetId={review.id}
          authorUsername={review.user.username}
          authorId={review.user.id}
          authorDeactivated={deactivated}
          canModerate={canModerate}
        />
      )}
    </article>
  );
}
