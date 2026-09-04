import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FeedActivityList } from "@/components/feed/FeedActivityList";
import type { FeedEntry } from "@/services/feed/feed";

interface FeedPreviewProps {
  entries: FeedEntry[];
}

// Preview compacto del feed de seguidos: mismos datos y misma presentación por
// peso que /me/feed (ver openspec/changes/redesign-feed), sin paginación ni
// "cargar más" — el feed completo vive en su propia página.
export async function FeedPreview({ entries }: FeedPreviewProps) {
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
      {entries.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("feedPreviewEmpty")}</p>
      ) : (
        <FeedActivityList entries={entries} />
      )}
    </section>
  );
}
