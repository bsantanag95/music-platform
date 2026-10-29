import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername, type PublicProfile } from "@/services/social/profiles";
import { getConnectionsSummary, listConnectionsPage, type ConnectionsKind } from "@/services/social/following";
import { relationsFor } from "@/services/social/relations";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowButton } from "@/components/social/FollowButton";
import { ProfileConnectionsHeader } from "./ProfileConnectionsHeader";
import { ConnectionsUserList } from "./ConnectionsUserList";

// Perfil de una vista de conexiones, o 404 (con redirección si el usuario cambió de nombre).
export async function loadConnectionsProfile(username: string, path: string) {
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  try {
    return { session, viewerId, profile: await getProfileByUsername(username, viewerId) };
  } catch {
    await redirectIfRenamed(username, path);
    notFound();
  }
}

// Título de la pestaña del navegador: "<Pestaña> · <nombre>" (openspec: refine-connections-page-phase1, D1). Un
// usuario inexistente no rompe la metadata: la página resuelve el 404.
export async function connectionsMetadata(username: string, tabKey: "followingTab" | "followersTab" | "mutualTab") {
  const t = await getTranslations("users");
  let name = username;
  try {
    const profile = await getProfileByUsername(username, null);
    name = profile.displayName ?? profile.username;
  } catch {
    // sin perfil: la página responde 404
  }
  return { title: `${t(`connections.${tabKey}`)} · ${name}` };
}

// Aviso de un perfil privado sin acceso, con el botón para pedir seguir si hay sesión y no hay bloqueo (D5). Las
// páginas lo esperan con `await` en lugar de anidarlo como componente asíncrono.
export async function PrivateConnectionsNotice({ profile, authenticated }: { profile: PublicProfile; authenticated: boolean }) {
  const t = await getTranslations("users");
  const canRequest = authenticated && profile.relation !== "blocked" && !profile.blockedByMe;
  return (
    <EmptyState
      compact
      title={t("connections.privateTitle")}
      description={t("connections.privateRequestHint")}
      action={
        canRequest ? (
          <FollowButton
            username={profile.username}
            relation={profile.relation}
            authenticated
            requestApproval
            refreshOnAnyChange
          />
        ) : undefined
      }
    />
  );
}

// Seguidos o Seguidores de un perfil (openspec: refine-connections-page-phase1): cabecera con cifras, las primeras 50
// personas con "Mostrar más", y la gestión propia desde cada fila cuando el visitante es el dueño.
export async function ProfileConnectionsView({ username, kind }: { username: string; kind: ConnectionsKind }) {
  const t = await getTranslations("users");
  const { session, viewerId, profile } = await loadConnectionsProfile(username, `/connections/${kind}`);
  const isOwn = profile.relation === "self";

  const summary = profile.accessible ? await getConnectionsSummary(profile.id) : null;
  const page = profile.accessible ? await listConnectionsPage(profile.id, kind) : { users: [], hasNext: false };
  const relations = await relationsFor(viewerId, page.users.map((user) => user.id));
  const total = kind === "followers" ? (summary?.followerCount ?? 0) : (summary?.followingCount ?? 0);

  const emptyTitle = t(`connections.empty.${kind}`, { own: isOwn ? "yes" : "no" });
  const empty =
    isOwn && kind === "following" ? (
      <EmptyState
        compact
        title={emptyTitle}
        description={t("connections.emptyFindPeopleDescription")}
        action={
          <Link
            href="/users"
            className="rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
          >
            {t("connections.emptyFindPeople")}
          </Link>
        }
      />
    ) : (
      <p className="font-body text-sm text-paper-muted">{emptyTitle}</p>
    );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <ProfileConnectionsHeader
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={summary?.avatarUrl ?? null}
        active={kind}
        isOwn={isOwn}
        showMutualTab={viewerId !== null && !isOwn}
        counts={summary ? { followers: summary.followerCount, following: summary.followingCount } : null}
      />
      {!profile.accessible ? (
        await PrivateConnectionsNotice({ profile, authenticated: Boolean(session) })
      ) : (
        <ConnectionsUserList
          users={page.users.map((user) => ({ ...user, relation: relations.get(user.id) }))}
          authenticated={Boolean(session)}
          empty={empty}
          ownRemovableFollowers={isOwn && kind === "followers"}
          ownFollowing={isOwn && kind === "following"}
          paging={{ username: profile.username, kind, total, hasNext: page.hasNext }}
        />
      )}
    </main>
  );
}
