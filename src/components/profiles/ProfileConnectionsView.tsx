import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername, type PublicProfile } from "@/services/social/profiles";
import {
  countConnectionSegments,
  countPendingFollowRequests,
  followersOf,
  getConnectionsSummary,
  listConnectionsPage,
  type ConnectionsKind,
} from "@/services/social/following";
import {
  defaultConnectionSort,
  parseConnectionSegment,
  parseConnectionSort,
} from "@/services/social/connection-filters";
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

type SearchParams = Record<string, string | string[] | undefined>;

// Seguidos o Seguidores de un perfil (openspec: refine-connections-page-phase1, redesign-connections-toolbar): cabecera
// con cifras, búsqueda y orden (más los segmentos y el aviso de solicitudes en las vistas propias), las primeras 50
// personas con "Mostrar más", y la gestión propia desde cada fila cuando el visitante es el dueño.
export async function ProfileConnectionsView({
  username,
  kind,
  searchParams = {},
}: {
  username: string;
  kind: ConnectionsKind;
  searchParams?: SearchParams;
}) {
  const t = await getTranslations("users");
  const { session, viewerId, profile } = await loadConnectionsProfile(username, `/connections/${kind}`);
  const isOwn = profile.relation === "self";

  // Filtros de la URL (D1, D2): un orden o segmento desconocido se ignora; el segmento solo existe para el dueño.
  const defaultSort = defaultConnectionSort(kind, isOwn);
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const sort = parseConnectionSort(searchParams.sort) ?? defaultSort;
  const segment = isOwn ? (parseConnectionSegment(searchParams.segment) ?? "all") : "all";

  const summary = profile.accessible ? await getConnectionsSummary(profile.id) : null;
  const page = profile.accessible
    ? await listConnectionsPage(profile.id, kind, { q, sort, segment })
    : { users: [], hasNext: false, nextCursor: null, total: 0 };
  const ids = page.users.map((user) => user.id);
  const [relations, followsViewer, segmentCounts, pendingRequests] = await Promise.all([
    relationsFor(viewerId, ids),
    followersOf(viewerId, ids),
    isOwn && profile.accessible ? countConnectionSegments(profile.id, kind) : Promise.resolve(undefined),
    isOwn && kind === "followers" ? countPendingFollowRequests(profile.id) : Promise.resolve(0),
  ]);

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
        <>
          {pendingRequests > 0 ? (
            <p className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber/40 bg-amber/10 px-4 py-2.5 font-body text-sm text-paper">
              {t("connections.pendingRequests", { count: pendingRequests })}
              <Link href="/me/follow-requests" className="font-data text-xs text-amber hover:text-amber-hover">
                {t("connections.pendingRequestsLink")}
              </Link>
            </p>
          ) : null}
          <ConnectionsUserList
            users={page.users.map((user) => ({
              ...user,
              relation: relations.get(user.id),
              followsYou: followsViewer.has(user.id),
            }))}
            authenticated={Boolean(session)}
            empty={empty}
            ownRemovableFollowers={isOwn && kind === "followers"}
            ownFollowing={isOwn && kind === "following"}
            paging={{
              username: profile.username,
              kind,
              total: page.total,
              hasNext: page.hasNext,
              nextCursor: page.nextCursor,
            }}
            filters={{ initial: { q, sort, segment }, defaultSort, segmentCounts }}
          />
        </>
      )}
    </main>
  );
}
