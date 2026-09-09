import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface OwnerHubPanelProps {
  /** Solicitudes de seguimiento pendientes recibidas (badge de bandeja). */
  pendingRequests: number;
}

// Panel de gestión del dueño: resume y enlaza las superficies profundas de
// `/me/*`. El perfil (`/users/{username}`) es la ruta canónica también para el
// dueño; estas páginas siguen siendo el destino de gestión. Ver spec
// social-profiles ("Panel del dueño").
export async function OwnerHubPanel({ pendingRequests }: OwnerHubPanelProps) {
  const t = await getTranslations("users");

  const links: { href: string; label: string; badge?: number }[] = [
    { href: "/me/diary", label: t("diaryTitle") },
    { href: "/me/favorites", label: t("favoritesTitle") },
    { href: "/me/artists", label: t("artistsFollowedTitle") },
    { href: "/me/lists", label: t("listsTitle") },
    { href: "/me/collection", label: t("collectionTitle") },
    { href: "/me/followers", label: t("followersTitle") },
    { href: "/me/following", label: t("followingTitle") },
    {
      href: "/me/follow-requests",
      label: t("requestsTitle"),
      badge: pendingRequests > 0 ? pendingRequests : undefined,
    },
    { href: "/me/blocks", label: t("blocksTitle") },
    { href: "/me/settings", label: t("profileVisibilityLabel") },
  ];

  return (
    <section className="flex w-full max-w-2xl flex-col gap-3" aria-label={t("hub.heading")}>
      <h2 className="font-display text-sm text-paper-muted">{t("hub.heading")}</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between gap-2 rounded border border-ink-border bg-ink-surface px-3 py-2 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
            >
              <span className="truncate">{link.label}</span>
              {link.badge != null && (
                <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 text-amber">
                  {t("hub.pendingRequests", { count: link.badge })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
