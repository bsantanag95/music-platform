import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "@/components/social/FollowButton";
import { UserAvatar } from "@/components/social/UserAvatar";
import { getMutualFollowersPreview } from "@/services/profiles/affinity";
import { listConnectionsPage, type ConnectionsKind } from "@/services/social/following";
import type { PublicProfile } from "@/services/social/profiles";

const FOLLOW_BACK_LIMIT = 5;

interface ConnectionsRailProps {
  profile: PublicProfile;
  kind: ConnectionsKind;
  viewerId: string | null;
}

// Panel lateral de Seguidos / Seguidores desde `lg` (openspec: enrich-connections-rows, D3): en tus Seguidores, "Para
// seguir de vuelta" (el botón dice solo "Seguir": el título ya lo explica y el nombre necesita el ancho); en un perfil
// ajeno, los seguidores en común. Devuelve `null` sin contenido, y la vista solo pasa a
// dos columnas cuando hay panel. Las páginas lo esperan con `await` en lugar de anidarlo como componente asíncrono.
export async function ConnectionsRail({ profile, kind, viewerId }: ConnectionsRailProps) {
  const t = await getTranslations("users.connections");
  const name = profile.displayName ?? profile.username;
  const base = `/users/${profile.username}/connections`;

  if (profile.relation === "self") {
    if (kind !== "followers") return null;
    const page = await listConnectionsPage(profile.id, "followers", { segment: "notBack", limit: FOLLOW_BACK_LIMIT });
    if (page.users.length === 0) return null;
    return (
      <aside aria-label={t("railLabel")} className="hidden flex-col gap-4 lg:flex">
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("railFollowBackTitle")}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {page.users.map((user) => {
              const userName = user.displayName ?? user.username;
              return (
                <li key={user.id} className="flex items-center gap-2">
                  <Link
                    href={`/users/${encodeURIComponent(user.username)}`}
                    className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-amber"
                  >
                    <UserAvatar avatarUrl={user.avatarUrl} username={user.username} name={userName} size="nav" />
                    <span className="truncate font-display text-sm text-paper">{userName}</span>
                  </Link>
                  <FollowButton
                    username={user.username}
                    relation="none"
                    authenticated
                    requestApproval={user.profileVisibility === "private"}
                  />
                </li>
              );
            })}
          </ul>
          {page.total > page.users.length ? (
            <Link
              href={`${base}/followers?segment=notBack`}
              className="mt-3 inline-block font-data text-xs text-amber hover:text-amber-hover"
            >
              {t("railSeeAll", { count: page.total })}
            </Link>
          ) : null}
        </section>
      </aside>
    );
  }

  if (!viewerId || !profile.accessible) return null;
  const preview = await getMutualFollowersPreview(profile.username, viewerId);
  if (!preview) return null;
  return (
    <aside aria-label={t("railLabel")} className="hidden flex-col gap-4 lg:flex">
      <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
        <h2 className="font-display text-base text-paper">{t("railInCommonTitle", { name })}</h2>
        <p className="mt-2 flex items-center gap-2 font-body text-sm text-paper-muted">
          <UserAvatar
            avatarUrl={preview.first.avatarUrl}
            username={preview.first.username}
            name={preview.first.displayName ?? preview.first.username}
            size="nav"
          />
          {t("railInCommonCount", { count: preview.total, name })}
        </p>
        <Link href={`${base}/mutual`} className="mt-3 inline-block font-data text-xs text-amber hover:text-amber-hover">
          {t("railInCommonLink")}
        </Link>
      </section>
    </aside>
  );
}
