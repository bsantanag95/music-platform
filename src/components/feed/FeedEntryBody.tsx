import { Link } from "@/i18n/navigation";
import { ReactionBadge } from "@/components/diary/ReactionBadge";
import type { FeedEntry } from "@/lib/api/schemas";

function targetHref(type: "artist" | "release-group" | "recording", id: string): string {
  if (type === "artist") return `/artist/${id}`;
  if (type === "release-group") return `/album/${id}`;
  return `/song/${id}`;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Tarjeta completa de una entrada de feed (autor + cuerpo por `kind` + fecha),
// compartida entre /me/feed y los bloques de Inicio que muestran listas de
// `FeedEntry` (actividad de la comunidad, listas públicas, preview de feed).
export function FeedEntryCard({
  entry,
  t,
  locale,
}: {
  entry: FeedEntry;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
}) {
  return (
    <li className="rounded border border-ink-border bg-ink-surface p-4">
      <div className="min-w-0">
        <Link
          href={`/users/${encodeURIComponent(entry.author.username)}`}
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {entry.author.displayName ?? `@${entry.author.username}`}
        </Link>
        <FeedEntryBody entry={entry} t={t} />
        <time dateTime={entry.createdAt} className="mt-1 block font-data text-xs text-paper-muted">
          {formatDate(entry.createdAt, locale)}
        </time>
      </div>
    </li>
  );
}

// Render por tipo de entrada de `FeedEntry`, compartido entre /me/feed y los
// bloques de Inicio (actividad de la comunidad, listas públicas, preview de
// feed de seguidos) — todos consumen datos con esta misma forma.
export function FeedEntryBody({
  entry,
  t,
}: {
  entry: FeedEntry;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (entry.kind === "listen") {
    return (
      <div className="flex flex-col gap-1">
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
          <span>{t(`context.${entry.listenContext}`)}</span>
          <ReactionBadge reaction={entry.reaction} />
          <span>{t(`audience.${entry.audience}`)}</span>
        </div>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
        {entry.body ? <p className="mt-1 whitespace-pre-wrap font-body text-sm text-paper">{entry.body}</p> : null}
      </div>
    );
  }

  if (entry.kind === "favorite") {
    return (
      <div className="flex flex-col gap-1">
        <span className="mt-1 font-data text-xs text-paper-muted">{t("favoriteLabel")}</span>
        <Link
          href={targetHref(entry.targetType, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
      </div>
    );
  }

  if (entry.kind === "rating") {
    return (
      <div className="flex flex-col gap-1">
        <span className="mt-1 font-data text-xs text-paper-muted">
          {t("ratingLabel", { stars: entry.stars })}
        </span>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
      </div>
    );
  }

  if (entry.kind === "comment") {
    return (
      <div className="flex flex-col gap-1">
        <span className="mt-1 font-data text-xs text-paper-muted">{t("commentLabel")}</span>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="font-display text-lg text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
        <p className="mt-1 whitespace-pre-wrap font-body text-sm text-paper">{entry.body}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="mt-1 font-data text-xs text-paper-muted">
        {t(`list.${entry.event}`)}
      </span>
      <Link
        href={`/users/${encodeURIComponent(entry.author.username)}/lists/${entry.list.id}`}
        className="font-display text-lg text-paper transition-colors hover:text-amber"
      >
        {entry.list.title}
      </Link>
    </div>
  );
}
