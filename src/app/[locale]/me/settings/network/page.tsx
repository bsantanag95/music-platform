import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { countPendingFollowRequests } from "@/services/social/following";
import { buildUserMenuItems } from "@/components/layout/user-menu-items";
import { SettingsSection } from "@/components/settings/SettingsSection";

// Pantalla Red (spec owner-settings): enlaza las superficies existentes —
// solicitudes, seguidores, seguidos y cuentas bloqueadas— sin reimplementar
// listados. Los destinos salen de la superficie `settings` de
// `user-menu-items.ts`, la misma definición que el menú del Header.
export default async function NetworkSettingsPage() {
  const t = await getTranslations("users");
  const tCommon = await getTranslations("common");
  const user = await requirePageUser();
  const pendingRequests = await countPendingFollowRequests(user.id);
  const items = buildUserMenuItems({
    username: user.username,
    pendingFollowRequests: pendingRequests,
    surface: "settings",
  });

  return (
    <SettingsSection title={t("settings.network.title")} intro={t("settings.network.intro")}>
      <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border bg-ink-surface">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm text-paper">{tCommon(item.labelKey)}</span>
                <span className="block font-body text-xs text-paper-muted">
                  {t(`settings.network.hint.${item.id}`)}
                </span>
              </span>
              {item.badgeCount != null && (
                <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 font-data text-xs text-amber">
                  {tCommon("pendingFollowRequests", { count: item.badgeCount })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
