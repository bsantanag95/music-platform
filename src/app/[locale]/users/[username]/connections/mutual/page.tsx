import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listMutualFollowers, listMutualFollowing } from "@/services/profiles/affinity";
import { relationsFor } from "@/services/social/relations";
import { ProfileConnectionsHeader } from "@/components/profiles/ProfileConnectionsHeader";
import { ConnectionsSection, ConnectionsUserList } from "@/components/profiles/ConnectionsUserList";
import type { UserSummary } from "@/lib/api/schemas";
import { getConnectionsSummary } from "@/services/social/following";
import {
  connectionsMetadata,
  loadConnectionsProfile,
  PrivateConnectionsNotice,
} from "@/components/profiles/ProfileConnectionsView";

interface PageProps {
  params: Promise<{ username: string }>;
}

// "Seguidos en común": lo que el visitante y el dueño del perfil tienen en
// común en su red — dos listados aparte (cuentas que ambos siguen, y cuentas
// que siguen a ambos), no uno solo, porque son conjuntos distintos (ver
// `listMutualFollowing`/`listMutualFollowers`). Requiere sesión y que no sea
// el propio perfil — la pestaña ni se muestra en ese caso
// (`ProfileConnectionsHeader`), pero esta página también se defiende si se
// visita la URL directo.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return connectionsMetadata(username, "mutualTab");
}

export default async function ProfileMutualConnectionsPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("users");
  const { session, viewerId, profile } = await loadConnectionsProfile(username, "/connections/mutual");

  const applicable = viewerId !== null && profile.relation !== "self";
  const summary = profile.accessible ? await getConnectionsSummary(profile.id) : null;
  const [following, followers] = applicable && profile.accessible
    ? await Promise.all([
        listMutualFollowing(viewerId, profile.id, 1, 50),
        listMutualFollowers(viewerId, profile.id, 1, 50),
      ])
    : [{ users: [] as UserSummary[] }, { users: [] as UserSummary[] }];
  const relations = await relationsFor(viewerId, [...following.users, ...followers.users].map((user) => user.id));
  const withRelation = (users: UserSummary[]) =>
    users.map((user) => ({ ...user, relation: relations.get(user.id) }));
  const empty = <p className="font-body text-sm text-paper-muted">{t("connections.mutualEmpty")}</p>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <ProfileConnectionsHeader
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={summary?.avatarUrl ?? null}
        active="mutual"
        isOwn={profile.relation === "self"}
        showMutualTab={applicable}
        counts={summary ? { followers: summary.followerCount, following: summary.followingCount } : null}
      />
      {!profile.accessible ? (
        await PrivateConnectionsNotice({ profile, authenticated: Boolean(session) })
      ) : !applicable ? (
        <p className="font-body text-sm text-paper-muted">{t("connections.mutualSignInHint")}</p>
      ) : (
        <>
          <ConnectionsSection heading={t("connections.mutualFollowingHeading")}>
            <ConnectionsUserList users={withRelation(following.users)} authenticated={Boolean(session)} empty={empty} />
          </ConnectionsSection>
          <ConnectionsSection heading={t("connections.mutualFollowersHeading")}>
            <ConnectionsUserList users={withRelation(followers.users)} authenticated={Boolean(session)} empty={empty} />
          </ConnectionsSection>
        </>
      )}
    </main>
  );
}
