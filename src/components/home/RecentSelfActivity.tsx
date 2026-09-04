import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ScrollablePreviewList } from "@/components/home/ScrollablePreviewList";
import type { FeedComment, FeedListenEntry, FeedRating } from "@/services/feed/feed";

interface RecentSelfActivityProps {
  initialEntries: (FeedListenEntry | FeedRating | FeedComment)[];
  initialHasNext: boolean;
}

// "Tu rastro reciente": las últimas escuchas, valoraciones y comentarios del
// propio usuario, como recap de presencia. Misma presentación por peso que
// /me/feed (ver openspec/changes/archive/*-redesign-feed), con scroll interno
// y carga incremental (ver home-scrollable-preview-lists). No renderiza nada
// si no hay actividad — ver docs/05-features/home.md.
export async function RecentSelfActivity({ initialEntries, initialHasNext }: RecentSelfActivityProps) {
  if (initialEntries.length === 0) return null;

  const t = await getTranslations("home");

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{t("recentActivityTitle")}</h2>
        <Link
          href="/me/diary"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("recentActivitySeeDiary")}
        </Link>
      </div>
      <ScrollablePreviewList source="self" initialEntries={initialEntries} initialHasNext={initialHasNext} />
    </section>
  );
}
