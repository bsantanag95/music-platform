import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import type { FeedListEvent } from "@/services/feed/feed";

interface PublicListsProps {
  entries: FeedListEvent[];
}

// Listas públicas recientes de cualquier usuario con perfil público, sin
// requerir seguimiento — ver docs/05-features/home.md. Las listas oficiales
// se suman cuando exista el sistema de roles de plataforma. Bloque de prueba
// social: siempre en layout denso.
export async function PublicLists({ entries }: PublicListsProps) {
  if (entries.length === 0) return null;

  const tHome = await getTranslations("home");

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{tHome("publicListsTitle")}</h2>

      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => (
          <CompactListRow key={`${entry.kind}-${entry.id}`} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

async function CompactListRow({ entry }: { entry: FeedListEvent }) {
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
          className="transition-colors hover:text-amber"
        >
          {authorLabel}
        </Link>
        <time dateTime={entry.createdAt}>{await relativeFeedDate(entry.createdAt)}</time>
      </div>
    </li>
  );
}
