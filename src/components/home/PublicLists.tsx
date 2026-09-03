import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FeedEntryCard, formatFeedDate } from "@/components/feed/FeedEntryBody";
import type { FeedListEvent } from "@/services/feed/feed";

interface PublicListsProps {
  entries: FeedListEvent[];
  // Muestra el disco de vinilo a la izquierda de cada tarjeta (layout de
  // tarjeta; los eventos de lista no tienen carátula de álbum).
  withCover?: boolean;
  // Layout denso: título + autor + fecha con hairline, sin tarjeta ni disco.
  // Usado en Inicio anónimo (ver docs/05-features/home.md).
  compact?: boolean;
}

// Listas públicas recientes de cualquier usuario con perfil público, sin
// requerir seguimiento — ver docs/05-features/home.md. Las listas oficiales
// se suman cuando exista el sistema de roles de plataforma.
export async function PublicLists({
  entries,
  withCover = false,
  compact = false,
}: PublicListsProps) {
  if (entries.length === 0) return null;

  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section className={compact ? "flex w-full flex-col gap-3" : "flex w-full max-w-3xl flex-col gap-4"}>
      <h2 className="font-display text-xl text-paper">{tHome("publicListsTitle")}</h2>

      {compact ? (
        <ul className="divide-y divide-ink-border">
          {entries.map((entry) => (
            <CompactListRow key={`${entry.kind}-${entry.id}`} entry={entry} locale={locale} />
          ))}
        </ul>
      ) : (
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
      )}
    </section>
  );
}

function CompactListRow({ entry, locale }: { entry: FeedListEvent; locale: string }) {
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;

  return (
    <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
      <Link
        href={`/users/${encodeURIComponent(username)}/lists/${entry.list.id}`}
        className="truncate font-display text-sm text-paper transition-colors hover:text-amber"
      >
        {entry.list.title}
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">
        <Link
          href={`/users/${encodeURIComponent(username)}`}
          className="transition-colors hover:text-paper"
        >
          {authorLabel}
        </Link>
        <time dateTime={entry.createdAt}>{formatFeedDate(entry.createdAt, locale)}</time>
      </div>
    </li>
  );
}
