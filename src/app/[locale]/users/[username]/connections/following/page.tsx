import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listFollowing } from "@/services/social/following";
import { relationsFor } from "@/services/social/relations";
import { ProfileConnectionsHeader } from "@/components/profiles/ProfileConnectionsHeader";
import { ConnectionsUserList } from "@/components/profiles/ConnectionsUserList";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";

interface PageProps {
  params: Promise<{ username: string }>;
}

// "Seguidos" de un perfil ajeno — mismo criterio de acceso que el resto del
// perfil (`profile.accessible`): público si la cuenta es pública, o si el
// visitante es seguidor aprobado/dueño (openspec: nueva capacidad, ver
// docs/05-features/user-profile.md, "Listados de conexiones"). Cuando el
// visitante es el propio dueño, esta es también su página de gestión (unifica
// lo que antes era `/me/following`) — "dejar de seguir" ya sale solo del
// `FollowButton`, sin caso especial: la relación del dueño hacia cada persona
// de su propia lista de seguidos es, por definición, "following".
export default async function ProfileFollowingPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/connections/following");
    notFound();
  }

  const { users } = profile.accessible ? await listFollowing(profile.id, 1, 50) : { users: [] };
  const relations = await relationsFor(viewerId, users.map((user) => user.id));

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <ProfileConnectionsHeader
          username={profile.username}
          active="following"
          showMutualTab={viewerId !== null && profile.relation !== "self"}
        />
        {!profile.accessible ? (
          <p className="font-body text-sm text-paper-muted">{t("connections.privateNotice")}</p>
        ) : (
          <ConnectionsUserList
            users={users.map((user) => ({ ...user, relation: relations.get(user.id) }))}
            authenticated={Boolean(session)}
            emptyMessage={t("connections.emptyFollowing")}
          />
        )}
      </div>
    </main>
  );
}
