import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildUserMenuItems } from "@/components/layout/user-menu-items";

interface OwnerHubPanelProps {
  /** Solicitudes de seguimiento pendientes recibidas (badge de bandeja). */
  pendingRequests: number;
}

// Panel de gestión del dueño: resume y enlaza las superficies profundas de
// `/me/*`. El perfil (`/users/{username}`) es la ruta canónica también para el
// dueño; estas páginas siguen siendo el destino de gestión. Ver spec
// social-profiles ("Panel del dueño").
//
// Los destinos salen de `user-menu-items.ts` (superficie `panel`), misma fuente
// que el menú de usuario del Header, para que ambos no puedan divergir.
export async function OwnerHubPanel({ pendingRequests }: OwnerHubPanelProps) {
  const t = await getTranslations("common");
  const tHub = await getTranslations("users");
  const items = buildUserMenuItems({ pendingFollowRequests: pendingRequests, surface: "panel" });

  return (
    <section className="flex w-full max-w-2xl flex-col gap-3" aria-label={tHub("hub.heading")}>
      <h2 className="font-display text-sm text-paper-muted">{tHub("hub.heading")}</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-2 rounded border border-ink-border bg-ink-surface px-3 py-2 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
            >
              <span className="truncate">{t(item.labelKey)}</span>
              {item.badgeCount != null && (
                <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 text-amber">
                  {t("pendingFollowRequests", { count: item.badgeCount })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
