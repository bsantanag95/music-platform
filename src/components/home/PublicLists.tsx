import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import { ListMosaic } from "@/components/home/ListMosaic";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { listHref } from "@/lib/catalog-links";
import type { HomePublicList } from "@/services/home/home";

interface PublicListsProps {
  entries: HomePublicList[];
}

// Listas públicas recientes de cualquier usuario con perfil público, sin
// requerir seguimiento — ver docs/05-features/home.md. Las listas oficiales
// se suman cuando exista el sistema de roles de plataforma. Bloque de prueba
// social: siempre en layout denso, cada fila con el mini-mosaico de carátulas
// de la lista (mismo de "Retoma una lista") para que se reconozca de un vistazo.
export async function PublicLists({ entries }: PublicListsProps) {
  if (entries.length === 0) return null;

  const [tHome, tLists] = await Promise.all([getTranslations("home"), getTranslations("lists")]);

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{tHome("publicListsTitle")}</h2>
        <Link
          href="/lists"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {tHome("resumeListSeeAll")}
        </Link>
      </div>

      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => (
          <CompactListRow
            key={`${entry.kind}-${entry.id}`}
            entry={entry}
            typeLabel={tLists(
              entry.list.entityType === "artist"
                ? "entityTypeArtist"
                : entry.list.entityType === "recording"
                  ? "entityTypeSong"
                  : "entityTypeAlbum",
            )}
            countLabel={
              entry.itemCount === 0
                ? tHome("resumeListEmpty")
                : tHome("resumeListItemCount", { count: entry.itemCount })
            }
          />
        ))}
      </ul>
    </section>
  );
}

async function CompactListRow({
  entry,
  typeLabel,
  countLabel,
}: {
  entry: HomePublicList;
  typeLabel: string;
  countLabel: string;
}) {
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <ListMosaic covers={entry.coverThumbUrls} className="size-12" />
      <div className="min-w-0 flex-1">
        <Link
          href={listHref(username, entry.list.title, entry.list.id)}
          className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {entry.list.title}
        </Link>
        <p className="mt-0.5 truncate font-data text-xs text-paper-muted">
          {typeLabel}
          <span aria-hidden="true" className="mx-1.5">
            ·
          </span>
          {countLabel}
        </p>
        <div className="flex items-baseline justify-between gap-3 font-data text-xs text-paper-muted">
          <UserHoverCard username={username}>
            <Link
              href={`/users/${encodeURIComponent(username)}`}
              className="truncate transition-colors hover:text-amber"
            >
              {authorLabel}
            </Link>
          </UserHoverCard>
          <time dateTime={entry.createdAt} className="shrink-0">
            {await relativeFeedDate(entry.createdAt)}
          </time>
        </div>
      </div>
    </li>
  );
}
