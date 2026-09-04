import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ScrollablePreviewList } from "@/components/home/ScrollablePreviewList";
import type { FeedEntry } from "@/services/feed/feed";

interface FeedPreviewProps {
  initialEntries: FeedEntry[];
  initialHasNext: boolean;
}

// Preview del feed de seguidos: misma presentación por peso que /me/feed (ver
// openspec/changes/archive/*-redesign-feed), con scroll interno y carga
// incremental (ver home-scrollable-preview-lists) en vez de "cargar más" — el
// feed completo con su propio botón vive en /me/feed.
export async function FeedPreview({ initialEntries, initialHasNext }: FeedPreviewProps) {
  const t = await getTranslations("home");

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{t("feedPreviewTitle")}</h2>
        <Link
          href="/me/feed"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("feedPreviewSeeAll")}
        </Link>
      </div>
      {initialEntries.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("feedPreviewEmpty")}</p>
      ) : (
        <ScrollablePreviewList
          source="feed"
          initialEntries={initialEntries}
          initialHasNext={initialHasNext}
        />
      )}
    </section>
  );
}
