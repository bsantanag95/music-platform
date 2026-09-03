import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  FeedEntryCard,
  formatFeedDate,
  targetHref,
} from "@/components/feed/FeedEntryBody";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { FeedComment, FeedRating } from "@/services/feed/feed";

interface CommunityActivityProps {
  entries: (FeedRating | FeedComment)[];
  // Muestra la carátula del álbum en cada tarjeta (layout de tarjeta).
  withCover?: boolean;
  // Layout denso: filas con hairline en vez de tarjetas full-width. Usado en
  // Inicio anónimo, donde este bloque es prueba social, no contenido central
  // (ver docs/05-features/home.md).
  compact?: boolean;
}

// Ratings y comentarios públicos recientes de cualquier usuario con perfil
// público, sin requerir seguimiento — ver docs/05-features/home.md.
export async function CommunityActivity({
  entries,
  withCover = false,
  compact = false,
}: CommunityActivityProps) {
  if (entries.length === 0) return null;

  const [t, tHome, locale] = await Promise.all([
    getTranslations("feed"),
    getTranslations("home"),
    getLocale(),
  ]);

  return (
    <section
      className={
        compact
          ? "flex w-full flex-col gap-3"
          : "flex w-full max-w-3xl flex-col gap-4"
      }
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">
          {tHome("communityActivityTitle")}
        </h2>
      </div>

      {compact ? (
        <ul className="divide-y divide-ink-border">
          {entries.map((entry) => (
            <CompactActivityRow
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              t={t}
              locale={locale}
            />
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

function CompactActivityRow({
  entry,
  t,
  locale,
}: {
  entry: FeedRating | FeedComment;
  t: (key: string) => string;
  locale: string;
}) {
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;

  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      {/* Decorativa: el título va al lado como texto. */}
      <CoverThumb
        cover={entry.target.coverThumbUrl}
        label=""
        className="size-10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          <Link
            href={`/users/${encodeURIComponent(username)}`}
            className="transition-colors hover:text-paper"
          >
            {authorLabel}
          </Link>
          <span>
            {entry.kind === "comment"
              ? t("commentLabel")
              : `★ ${Number(entry.stars)}`}
          </span>
          <time dateTime={entry.createdAt}>
            {formatFeedDate(entry.createdAt, locale)}
          </time>
        </div>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
        {entry.kind === "comment" && entry.body ? (
          <p className="mt-0.5 line-clamp-2 font-body text-sm text-paper-muted">
            {entry.body}
          </p>
        ) : null}
      </div>
    </li>
  );
}
