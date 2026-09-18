import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type ConnectionsTab = "following" | "followers" | "mutual";

interface ProfileConnectionsHeaderProps {
  username: string;
  active: ConnectionsTab;
  /** La pestaña "Seguidos en común" solo tiene sentido con sesión y viendo a otra persona. */
  showMutualTab: boolean;
}

// Encabezado compartido de las 3 vistas de conexiones (openspec: nueva
// capacidad, ver docs/05-features/user-profile.md, "Listados de conexiones")
// — imitando la página dedicada de Letterboxd. Server Component puro, sin
// fetch propio: cada página resuelve sus propios datos y renderiza este
// header con el mismo `username`/`active`, para no arriesgar que un
// `layout.tsx` compartido siga renderizando `children` (con su propio fetch)
// aunque el perfil no sea accesible.
export async function ProfileConnectionsHeader({ username, active, showMutualTab }: ProfileConnectionsHeaderProps) {
  const t = await getTranslations("users");

  const tabs: { key: ConnectionsTab; label: string }[] = [
    { key: "following", label: t("connections.followingTab") },
    { key: "followers", label: t("connections.followersTab") },
    ...(showMutualTab ? [{ key: "mutual" as const, label: t("connections.mutualTab") }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/users/${username}`} className="font-data text-xs text-paper-muted hover:text-paper">
        @{username}
      </Link>
      <nav className="flex gap-1 border-b border-ink-border">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/users/${username}/connections/${tab.key}`}
            aria-current={tab.key === active ? "page" : undefined}
            className={`border-b-2 px-3 py-2 font-display text-sm transition-colors ${
              tab.key === active
                ? "border-amber text-paper"
                : "border-transparent text-paper-muted hover:text-paper"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
