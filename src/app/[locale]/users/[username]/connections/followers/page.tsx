import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listFollowers } from "@/services/social/following";
import { ProfileConnectionsHeader } from "@/components/profiles/ProfileConnectionsHeader";
import { ConnectionsUserList } from "@/components/profiles/ConnectionsUserList";

interface PageProps {
  params: Promise<{ username: string }>;
}

// "Seguidores" de un perfil ajeno — mismo criterio de acceso que "Seguidos"
// (ver following/page.tsx).
export default async function ProfileFollowersPage({ params }: PageProps) {
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
          active="followers"
          showMutualTab={viewerId !== null && profile.relation !== "self"}
        />
        {!profile.accessible ? (
          <p className="font-body text-sm text-paper-muted">{t("connections.privateNotice")}</p>
        ) : (
          <ConnectionsUserList
            users={(await listFollowers(profile.id, 1, 50)).users}
            viewerId={viewerId}
            authenticated={Boolean(session)}
            emptyMessage={t("connections.emptyFollowers")}
          />
        )}
      </div>
    </main>
  );
}
