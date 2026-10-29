import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { UserAvatar } from "@/components/social/UserAvatar";

export type ConnectionsTab = "following" | "followers" | "mutual";

interface ProfileConnectionsHeaderProps {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  active: ConnectionsTab;
  /** El visitante es el dueño: el subtítulo habla en segunda persona. */
  isOwn: boolean;
  /** La pestaña "Seguidos en común" solo tiene sentido con sesión y viendo a otra persona. */
  showMutualTab: boolean;
  /** Cifras de las pestañas; `null` sin acceso al perfil (no se muestran). */
  counts: { followers: number; following: number } | null;
  /**
   * Solicitudes pendientes del dueño: con al menos una, una pestaña más lleva a su bandeja
   * (openspec: enrich-follow-requests-context, D4).
   */
  requestsCount?: number;
}

// Encabezado compartido de las 3 vistas de conexiones (openspec: refine-connections-page-phase1, D1): migas hacia el
// perfil, avatar y nombre, `h1` con la pestaña activa y cifras en Seguidos y Seguidores. Server Component puro, sin
// fetch propio: cada página resuelve sus datos y renderiza este header, para no arriesgar que un `layout.tsx`
// compartido siga renderizando `children` (con su propio fetch) aunque el perfil no sea accesible.
export async function ProfileConnectionsHeader({
  username,
  displayName,
  avatarUrl,
  active,
  isOwn,
  showMutualTab,
  counts,
  requestsCount = 0,
}: ProfileConnectionsHeaderProps) {
  const t = await getTranslations("users");
  const name = displayName ?? username;

  const tabs: { key: ConnectionsTab; label: string; shortLabel?: string; count?: number }[] = [
    { key: "following", label: t("connections.followingTab"), count: counts?.following },
    { key: "followers", label: t("connections.followersTab"), count: counts?.followers },
    ...(showMutualTab
      ? [{ key: "mutual" as const, label: t("connections.mutualTab"), shortLabel: t("connections.mutualTabShort") }]
      : []),
  ];
  const title = tabs.find((tab) => tab.key === active)?.label ?? "";
  const subtitle = t(`connections.subtitle.${active}`, { name, own: isOwn ? "yes" : "no" });

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: name, href: `/users/${username}` }, { label: t("connections.title") }]} />
      <header className="flex items-center gap-3">
        <UserAvatar avatarUrl={avatarUrl} username={username} name={name} size="md" />
        <div className="flex min-w-0 flex-col">
          <h1 className="font-display text-2xl text-paper sm:text-3xl">{title}</h1>
          <p className="truncate font-body text-sm text-paper-muted">{subtitle}</p>
        </div>
      </header>
      <nav
        aria-label={t("connections.title")}
        className="flex gap-1 overflow-x-auto border-b border-ink-border [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/users/${username}/connections/${tab.key}`}
            aria-current={tab.key === active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 font-display text-sm transition-colors ${
              tab.key === active
                ? "border-amber text-paper"
                : "border-transparent text-paper-muted hover:text-paper"
            }`}
          >
            {tab.shortLabel ? (
              <>
                {/* En un teléfono la etiqueta larga desborda la fila de pestañas. */}
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
            {tab.count !== undefined ? (
              <span className="font-data text-xs text-paper-muted">{tab.count}</span>
            ) : null}
          </Link>
        ))}
        {isOwn && requestsCount > 0 ? (
          <Link
            href="/me/follow-requests"
            className="flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 font-display text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {t("requests.tabShort")}
            <span className="rounded bg-amber/15 px-1.5 font-data text-xs text-amber">{requestsCount}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
