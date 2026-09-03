import { getTranslations, getLocale } from "next-intl/server";
import { FeedEntryCard } from "@/components/feed/FeedEntryBody";
import type { FeedComment, FeedRating } from "@/services/feed/feed";

interface CommunityActivityProps {
  entries: (FeedRating | FeedComment)[];
  // Línea de contexto bajo el título (Inicio anónimo la usa para explicar
  // que el descubrimiento pasa por personas, no por un algoritmo).
  subtitle?: string;
  // Muestra la carátula del álbum en cada tarjeta.
  withCover?: boolean;
}

// Ratings y comentarios públicos recientes de cualquier usuario con perfil
// público, sin requerir seguimiento — ver docs/05-features/home.md.
export async function CommunityActivity({
  entries,
  subtitle,
  withCover = false,
}: CommunityActivityProps) {
  if (entries.length === 0) return null;

  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{tHome("communityActivityTitle")}</h2>
        {subtitle ? <p className="font-body text-sm text-paper-muted">{subtitle}</p> : null}
      </div>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <FeedEntryCard
            key={`${entry.kind}-${entry.id}`}
            entry={entry}
            t={t}
            locale={locale}
            withCover={withCover}
          />
        ))}
      </ul>
    </section>
  );
}
