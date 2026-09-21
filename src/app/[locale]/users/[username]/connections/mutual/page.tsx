import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listMutualFollowers, listMutualFollowing } from "@/services/profiles/affinity";
import { relationsFor } from "@/services/social/relations";
import { ProfileConnectionsHeader } from "@/components/profiles/ProfileConnectionsHeader";
import { ConnectionsSection, ConnectionsUserList } from "@/components/profiles/ConnectionsUserList";
import type { UserSummary } from "@/lib/api/schemas";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";

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
export default async function ProfileMutualConnectionsPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/connections/mutual");
    notFound();
  }

  const applicable = viewerId !== null && profile.relation !== "self";
  const [following, followers] = applicable && profile.accessible
    ? await Promise.all([
        listMutualFollowing(viewerId, profile.id, 1, 50),
        listMutualFollowers(viewerId, profile.id, 1, 50),
      ])
    : [{ users: [] as UserSummary[] }, { users: [] as UserSummary[] }];
  const relations = await relationsFor(viewerId, [...following.users, ...followers.users].map((user) => user.id));
  const withRelation = (users: UserSummary[]) =>
    users.map((user) => ({ ...user, relation: relations.get(user.id) }));

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <ProfileConnectionsHeader username={profile.username} active="mutual" showMutualTab={applicable} />
        {!profile.accessible ? (
          <p className="font-body text-sm text-paper-muted">{t("connections.privateNotice")}</p>
        ) : !applicable ? (
          <p className="font-body text-sm text-paper-muted">{t("connections.mutualSignInHint")}</p>
        ) : (
          <>
            <ConnectionsSection heading={t("connections.mutualFollowingHeading")}>
              <ConnectionsUserList
                users={withRelation(following.users)}
                authenticated={Boolean(session)}
                emptyMessage={t("connections.mutualEmpty")}
              />
            </ConnectionsSection>
            <ConnectionsSection heading={t("connections.mutualFollowersHeading")}>
              <ConnectionsUserList
                users={withRelation(followers.users)}
                authenticated={Boolean(session)}
                emptyMessage={t("connections.mutualEmpty")}
              />
            </ConnectionsSection>
          </>
        )}
      </div>
    </main>
  );
}
