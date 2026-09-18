import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listFollowing } from "@/services/social/following";
import { ProfileConnectionsHeader } from "@/components/profiles/ProfileConnectionsHeader";
import { ConnectionsUserList } from "@/components/profiles/ConnectionsUserList";

interface PageProps {
  params: Promise<{ username: string }>;
}

// "Seguidos" de un perfil ajeno — mismo criterio de acceso que el resto del
// perfil (`profile.accessible`): público si la cuenta es pública, o si el
// visitante es seguidor aprobado/dueño (openspec: nueva capacidad, ver
// docs/05-features/user-profile.md, "Listados de conexiones").
export default async function ProfileFollowingPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

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
            users={(await listFollowing(profile.id, 1, 50)).users}
            viewerId={viewerId}
            authenticated={Boolean(session)}
            emptyMessage={t("connections.emptyFollowing")}
          />
        )}
      </div>
    </main>
  );
}
