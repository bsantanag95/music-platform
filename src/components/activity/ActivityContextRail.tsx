import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { TrendingConversation } from "@/services/activity/trending-conversations";

// Por debajo de este número de seguidos, "Sigue a más gente" invita a descubrir personas (redesign-activity-page, D10).
export const FOLLOW_MORE_THRESHOLD = 3;
// La cifra "N personas" se muestra desde 5, como en el resto de las superficies de comunidad (business-rules.md,
// Popularidad): un álbum entra al riel desde 2 personas, pero una cifra chica puede delatar quiénes son.
export const PEOPLE_COUNT_MIN_SHOWN = 5;

interface ActivityContextRailProps {
  conversations: TrendingConversation[];
  // `null` sin sesión: la tarjeta invita a crear una cuenta en vez de a descubrir personas.
  followingCount: number | null;
}

// Riel lateral de `/activity` (redesign-activity-page, fase 3): contexto real junto al feed, nunca relleno. Cada módulo
// se oculta cuando no tiene nada que decir; sin ninguno, el riel no renderiza nada.
export async function ActivityContextRail({ conversations, followingCount }: ActivityContextRailProps) {
  const t = await getTranslations("feed");
  const showFollowCard = followingCount === null || followingCount < FOLLOW_MORE_THRESHOLD;
  if (conversations.length === 0 && !showFollowCard) return null;

  return (
    <aside aria-label={t("community.rail.label")} className="flex w-full flex-col gap-4">
      {conversations.length > 0 ? (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("community.rail.conversationTitle")}</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {conversations.map((album) => (
              <li key={album.releaseGroupId} className="flex items-center gap-3">
                <CoverThumb cover={album.coverThumbUrl} label="" className="size-10 ring-1 ring-ink-border" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={albumHref(album.artistName, album.title, album.releaseGroupId)}
                    className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
                  >
                    {album.title}
                  </Link>
                  <p className="truncate font-data text-xs text-paper-muted">
                    {album.artistName && album.artistId ? (
                      <Link
                        href={artistHref(album.artistName, album.artistId)}
                        className="transition-colors hover:text-paper"
                      >
                        {album.artistName}
                      </Link>
                    ) : (
                      album.artistName
                    )}
                    {album.people >= PEOPLE_COUNT_MIN_SHOWN ? (
                      <>
                        {album.artistName ? " · " : null}
                        {t("community.rail.people", { count: album.people })}
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {showFollowCard ? (
        <section className="rounded-lg border border-ink-border px-4 py-4">
          <h2 className="font-display text-base text-paper">
            {followingCount === null ? t("community.rail.joinTitle") : t("community.rail.followTitle")}
          </h2>
          <p className="mt-1 font-body text-sm text-paper-muted">
            {followingCount === null ? t("community.rail.joinDescription") : t("community.rail.followDescription")}
          </p>
          <Link
            href={followingCount === null ? "/auth/register" : "/users"}
            className="mt-3 inline-flex w-full items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
          >
            {followingCount === null ? t("community.rail.joinAction") : t("community.empty.discoverAction")}
          </Link>
        </section>
      ) : null}
    </aside>
  );
}
