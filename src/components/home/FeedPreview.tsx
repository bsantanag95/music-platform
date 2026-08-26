import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FeedEntryCard } from "@/components/feed/FeedEntryBody";
import type { FeedEntry } from "@/services/feed/feed";

interface FeedPreviewProps {
  entries: FeedEntry[];
}

// Preview compacto del feed de seguidos: mismos datos que /me/feed, sin
// paginación ni "cargar más" — el feed completo vive en su propia página.
export async function FeedPreview({ entries }: FeedPreviewProps) {
  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{tHome("feedPreviewTitle")}</h2>
        <Link href="/me/feed" className="font-data text-xs text-paper-muted transition-colors hover:text-paper">
          {tHome("feedPreviewSeeAll")}
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{tHome("feedPreviewEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <FeedEntryCard key={`${entry.kind}-${entry.id}`} entry={entry} t={t} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}
