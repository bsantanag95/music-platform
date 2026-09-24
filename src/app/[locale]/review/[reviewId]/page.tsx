import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReviewArticle } from "@/components/album/ReviewArticle";
import { reviewHeadline } from "@/components/album/album-format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { isValidUuid } from "@/lib/validation";
import { getReviewDetail } from "@/services/reviews";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";

// Página propia de una reseña de álbum (openspec: redesign-album-page, capability
// `review-detail`): la dirección que se comparte y a la que llegan feed, perfil y
// notificaciones. Desde el índice del álbum la misma URL se abre como modal.

interface ReviewPageProps {
  params: Promise<{ reviewId: string }>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { reviewId } = await params;
  if (!isValidUuid(reviewId)) return {};
  const detail = await getReviewDetail(reviewId);
  if (!detail) return {};
  const t = await getTranslations("catalog.album.reviewPage");
  return { title: `${reviewHeadline(detail.review)} · ${t("reviewOf", { album: detail.album.title })}` };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { reviewId } = await params;
  if (!isValidUuid(reviewId)) notFound();
  const detail = await getReviewDetail(reviewId);
  if (!detail) notFound();

  const tCommon = await getTranslations("common");
  const tTabs = await getTranslations("catalog.album.tabs");
  const session = await resolveSession();
  const userId = session?.user.id ?? null;
  const canModerate = userId
    ? (await getUserPermissions(userId)).includes("moderation.suspend_social")
    : false;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: detail.album.title, href: `/album/${detail.album.id}` },
          { label: tTabs("reviews"), href: `/album/${detail.album.id}/reviews` },
          { label: reviewHeadline(detail.review) },
        ]}
      />
      <ReviewArticle detail={detail} viewerId={userId} canModerate={canModerate} />
    </main>
  );
}
