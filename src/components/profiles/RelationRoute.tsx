import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { formatStars } from "@/components/album/album-format";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ReactionBadge } from "@/components/diary/ReactionBadge";
import { ShareButton } from "@/components/share/ShareButton";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import type { ListenReaction } from "@/lib/api/schemas";
import { reviewHref } from "@/lib/catalog-links";
import { parseCatalogSegment } from "@/lib/slug";
import { resolveSession } from "@/services/auth/sessions";
import { getRelationView } from "@/services/profiles/relation";
import { genericShareMetadata, shareMetadataFor, sharePayloadFor } from "@/services/share/metadata";
import { loadRelationTarget, type RelationType } from "@/services/share/targets/relation";

// Página de relación de una persona con un álbum o una canción (spec relation-page): el destino de lo que comparte,
// porque quien llega por el enlace no tiene cuenta. Cada dato llega ya filtrado por `getRelationView`; los metadatos y
// el botón se calculan como anónimo, sea quien sea quien mira.

export interface RelationRouteProps {
  params: Promise<{ username: string; id: string }>;
  searchParams: Promise<{ escucha?: string | string[] }>;
}

async function readRoute({ params, searchParams }: RelationRouteProps) {
  const [{ username, id }, query, rawLocale] = await Promise.all([params, searchParams, getLocale()]);
  const listenId = typeof query.escucha === "string" ? query.escucha : null;
  const locale = rawLocale === "en" ? ("en" as const) : ("es" as const);
  return { username, objectId: parseCatalogSegment(id)?.id ?? null, listenId, locale };
}

export async function relationMetadata(type: RelationType, props: RelationRouteProps): Promise<Metadata> {
  const { username, objectId, listenId, locale } = await readRoute(props);
  const target = objectId ? await loadRelationTarget(username, type, objectId, locale, listenId) : null;
  if (!target) return genericShareMetadata(type === "album" ? "rating" : "listen", "-", locale);
  return { ...shareMetadataFor(target), title: target.title };
}

export async function RelationRoute({ type, ...props }: RelationRouteProps & { type: RelationType }) {
  const { username, objectId, listenId, locale } = await readRoute(props);
  if (!objectId) notFound();
  const session = await resolveSession();
  const [view, target] = await Promise.all([
    getRelationView(username, type, objectId, session?.user.id ?? null, locale, listenId),
    loadRelationTarget(username, type, objectId, locale, listenId),
  ]);
  if (!view) notFound();

  const [t, tUsers, tDiary, tCollection, format] = await Promise.all([
    getTranslations("users.relation"),
    getTranslations("users"),
    getTranslations("diary"),
    getTranslations("collection"),
    getFormatter(),
  ]);
  const { owner, object, rating, listens, review } = view;
  const name = owner.displayName ?? `@${owner.username}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: `@${owner.username}`, href: `/users/${owner.username}` },
          { label: object.title, href: object.href },
          { label: t("title") },
        ]}
        action={target ? <ShareButton payload={sharePayloadFor(target)} /> : undefined}
      />

      <header className="flex items-center gap-4">
        <CoverThumb cover={object.coverThumbUrl} label="" className="size-24 shrink-0 rounded" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-2xl text-paper">
            <Link href={object.href} className="hover:underline">
              {object.title}
            </Link>
          </h1>
          {object.artistName ? <p className="font-body text-paper-muted">{object.artistName}</p> : null}
          <p className="font-data text-xs text-paper-muted">
            <Link href={`/users/${owner.username}`} className="hover:text-paper hover:underline">
              {t("ownedBy", { name })}
            </Link>
          </p>
        </div>
      </header>

      {rating ? (
        <section aria-label={t("rating")} className="flex flex-col gap-1">
          <h2 className="font-display text-sm text-paper-muted">{t("rating")}</h2>
          <StarRatingValue
            stars={rating.stars}
            detailedScore={rating.detailedScore}
            showScore
            label={
              rating.detailedScore != null
                ? tUsers("reviews.ratingLabelScore", { stars: formatStars(Number(rating.stars), locale), score: rating.detailedScore })
                : tUsers("reviews.ratingLabel", { stars: formatStars(Number(rating.stars), locale) })
            }
          />
        </section>
      ) : null}

      {view.favorite || view.collectionFormats.length > 0 ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 font-data text-xs text-paper-muted">
          {view.favorite ? <span>{t("favorite")}</span> : null}
          {view.collectionFormats.map((item) => (
            <span key={item}>{tCollection(`format.${item as "vinyl"}`)}</span>
          ))}
        </p>
      ) : null}

      {review ? (
        <section aria-label={t("review")} className="flex flex-col gap-2">
          <h2 className="font-display text-sm text-paper-muted">{t("review")}</h2>
          {review.title ? <p className="font-display text-lg text-paper">{review.title}</p> : null}
          <p className="line-clamp-4 whitespace-pre-wrap font-body text-paper">{review.body}</p>
          <Link href={reviewHref(owner.username, object.title, review.id)} className="w-fit font-data text-sm text-amber underline-offset-4 hover:underline">
            {t("readReview")}
          </Link>
        </section>
      ) : null}

      {listens.length > 0 ? (
        <section aria-label={t("listens")} className="flex flex-col gap-2">
          <h2 className="font-display text-sm text-paper-muted">{t("listens")}</h2>
          <ul className="flex flex-col gap-2">
            {listens.map((listen) => (
              <li
                key={listen.id}
                id={`escucha-${listen.id}`}
                aria-current={listen.focused ? "true" : undefined}
                className={`flex flex-col gap-1 rounded border bg-ink-surface p-3 ${listen.focused ? "border-amber" : "border-ink-border"}`}
              >
                <p className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">
                  <time dateTime={listen.createdAt}>{format.dateTime(new Date(listen.createdAt), { dateStyle: "long" })}</time>
                  <span aria-hidden="true">·</span>
                  <span>{tDiary(`context.${listen.listenContext as "first_listen"}`)}</span>
                  <ReactionBadge reaction={listen.reaction as ListenReaction | null} />
                </p>
                {listen.body ? <p className="whitespace-pre-wrap font-body text-paper">{listen.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
