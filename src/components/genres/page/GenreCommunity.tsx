import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { CommunityListCard } from "@/components/lists/CommunityListCard";
import { ListsGrid } from "@/components/lists/lists-shared";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { HorizontalRail } from "@/components/ui/HorizontalRail";
import { Link } from "@/i18n/navigation";
import { albumHref, reviewHref } from "@/lib/catalog-links";
import { formatStars, reviewHeadline } from "@/components/album/album-format";
import { GENRE_LIST_MIN_ALBUMS } from "@/services/genres/constants";
import type { GenreList } from "@/services/genres/lists";
import { genrePageHref, type GenrePageParams } from "@/services/genres/page-params";
import type { ReviewDetail } from "@/services/reviews";
import { GenrePagination } from "./GenrePagination";

// Comunidad del género (openspec: redesign-genre-page, capability `genre-page-community`): la
// pestaña Listas, el carrusel del Resumen y las reseñas recientes. Los componentes solo presentan lo
// que el servicio ya filtró (visibilidad, bloqueos, umbrales).

function GenreListEntry({ list, canSave }: { list: GenreList; canSave: boolean }) {
  const t = useTranslations("catalog.genres.page.lists");
  return (
    <div className="flex h-full flex-col gap-1">
      <CommunityListCard list={list} canSave={canSave} />
      <p className="px-1 font-data text-xs text-paper-muted">{t("genreAlbums", { count: list.genreAlbumCount })}</p>
    </div>
  );
}

/** Pestaña Listas: grilla paginada, o el estado vacío con la invitación a crear una. */
export function GenreListsView({
  slug,
  params,
  lists,
  hasNext,
  canSave,
}: {
  slug: string;
  params: GenrePageParams;
  lists: GenreList[];
  hasNext: boolean;
  canSave: boolean;
}) {
  const t = useTranslations("catalog.genres.page.lists");
  if (lists.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription", { min: GENRE_LIST_MIN_ALBUMS })}
        action={
          canSave ? (
            <Link href="/me/lists" className="font-data text-sm text-amber underline-offset-2 hover:underline">
              {t("createCta")}
            </Link>
          ) : undefined
        }
      />
    );
  }
  return (
    <section aria-labelledby="genre-lists-heading" className="flex w-full flex-col gap-4">
      <h2 id="genre-lists-heading" className="sr-only">
        {t("heading")}
      </h2>
      <ListsGrid>
        {lists.map((list) => (
          <GenreListEntry key={list.id} list={list} canSave={canSave} />
        ))}
      </ListsGrid>
      <GenrePagination slug={slug} params={params} page={params.page} hasNext={hasNext} />
    </section>
  );
}

/** Carrusel del Resumen: las primeras listas y "Ver todas →" hacia la pestaña. Se omite sin listas. */
export function GenreListsPreview({
  slug,
  params,
  lists,
  canSave,
}: {
  slug: string;
  params: GenrePageParams;
  lists: GenreList[];
  canSave: boolean;
}) {
  const t = useTranslations("catalog.genres.page.lists");
  if (lists.length === 0) return null;
  return (
    <section aria-labelledby="genre-lists-preview" className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="genre-lists-preview" className="font-display text-xl text-paper">
          {t("heading")}
        </h2>
        <Link
          href={genrePageHref(slug, params, { tab: "lists", page: 1 })}
          className="font-data text-sm text-amber underline-offset-2 hover:underline"
        >
          {t("seeAll")} →
        </Link>
      </div>
      <HorizontalRail label={t("railLabel")} prevLabel={t("railPrev")} nextLabel={t("railNext")}>
        {lists.map((list) => (
          <li key={list.id} className="flex w-80 shrink-0 snap-start">
            <GenreListEntry list={list} canSave={canSave} />
          </li>
        ))}
      </HorizontalRail>
    </section>
  );
}

/** Reseñas recientes de álbumes del género. Se omite sin reseñas. */
export function GenreRecentReviews({ reviews }: { reviews: ReviewDetail[] }) {
  const t = useTranslations("catalog.genres.page.reviews");
  const tSocial = useTranslations("catalog.social");
  const format = useFormatter();
  const locale = useLocale();
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="genre-reviews-heading" className="flex w-full flex-col gap-3">
      <h2 id="genre-reviews-heading" className="font-display text-xl text-paper">
        {t("heading")}
      </h2>
      <ul className="flex flex-col gap-2">
        {reviews.map(({ review, album }) => {
          const author = review.user.deactivated ? tSocial("deactivatedAccount") : (review.user.displayName ?? review.user.username);
          return (
            <li
              key={review.id}
              className="flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
            >
              <Link href={albumHref(null, album.title, album.id)} className="shrink-0" tabIndex={-1} aria-hidden="true">
                <CoverThumb cover={album.coverThumbUrl} label="" className="size-14" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={albumHref(null, album.title, album.id)} className="truncate font-display text-sm text-paper hover:text-amber">
                  {album.title}
                </Link>
                <Link
                  href={reviewHref(review.user.username, album.title, review.id)}
                  scroll={false}
                  className="line-clamp-2 font-body text-sm text-paper-muted hover:text-paper [overflow-wrap:anywhere]"
                >
                  {reviewHeadline(review)}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 font-data text-xs text-paper-muted">
                  {review.rating && (
                    <StarRatingDisplay
                      value={review.rating.stars}
                      label={t("ratingLabel", { stars: formatStars(review.rating.stars, locale) })}
                    />
                  )}
                  <span>{t("byAuthor", { author })}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={review.createdAt}>{format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
