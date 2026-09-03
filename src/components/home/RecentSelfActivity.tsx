import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FeedEntryCard } from "@/components/feed/FeedEntryBody";
import type { FeedComment, FeedListenEntry, FeedRating } from "@/services/feed/feed";

interface RecentSelfActivityProps {
  entries: (FeedListenEntry | FeedRating | FeedComment)[];
}

// "Tu rastro reciente": las últimas escuchas, valoraciones y comentarios del
// propio usuario, como recap de presencia. Reusa el render por tipo de
// `FeedEntryCard`. No renderiza nada si no hay actividad — ver
// docs/05-features/home.md.
export async function RecentSelfActivity({ entries }: RecentSelfActivityProps) {
  if (entries.length === 0) return null;

  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{tHome("recentActivityTitle")}</h2>
        <Link
          href="/me/diary"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {tHome("recentActivitySeeDiary")}
        </Link>
      </div>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <FeedEntryCard key={`${entry.kind}-${entry.id}`} entry={entry} t={t} locale={locale} />
        ))}
      </ul>
    </section>
  );
}
