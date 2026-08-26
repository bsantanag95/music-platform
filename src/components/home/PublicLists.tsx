import { getTranslations, getLocale } from "next-intl/server";
import { FeedEntryCard } from "@/components/feed/FeedEntryBody";
import type { FeedListEvent } from "@/services/feed/feed";

interface PublicListsProps {
  entries: FeedListEvent[];
}

// Listas públicas recientes de cualquier usuario con perfil público, sin
// requerir seguimiento — ver docs/05-features/home.md. Las listas oficiales
// se suman cuando exista el sistema de roles de plataforma.
export async function PublicLists({ entries }: PublicListsProps) {
  if (entries.length === 0) return null;

  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{tHome("publicListsTitle")}</h2>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <FeedEntryCard key={`${entry.kind}-${entry.id}`} entry={entry} t={t} locale={locale} />
        ))}
      </ul>
    </section>
  );
}
