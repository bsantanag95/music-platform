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
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-xl text-paper">{tHome("publicListsTitle")}</h2>
        <Link
          href="/lists"
          className="shrink-0 whitespace-nowrap font-data text-xs text-paper-muted transition-colors hover:text-paper"
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
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href={listHref(username, entry.list.title, entry.list.id)}
            className="min-w-0 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {entry.list.title}
          </Link>
          <time dateTime={entry.createdAt} className="shrink-0 font-data text-xs text-paper-muted">
            {await relativeFeedDate(entry.createdAt)}
          </time>
        </div>
        {/* Una sola línea de contexto (autor · tipo · tamaño): la fila queda en
            dos líneas, igual que las de "Actividad de la comunidad". */}
        <p className="mt-0.5 flex min-w-0 items-baseline gap-x-1.5 font-data text-xs text-paper-muted">
          <UserHoverCard username={username}>
            <Link
              href={`/users/${encodeURIComponent(username)}`}
              className="min-w-0 shrink truncate text-paper transition-colors hover:text-amber"
            >
              {authorLabel}
            </Link>
          </UserHoverCard>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 whitespace-nowrap">
            {typeLabel} · {countLabel}
          </span>
        </p>
      </div>
    </li>
  );
}
