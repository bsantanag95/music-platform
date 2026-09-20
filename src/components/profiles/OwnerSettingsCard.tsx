import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface OwnerSettingsCardProps {
  /** Solicitudes de seguimiento pendientes recibidas (bandeja de entrada). */
  pendingRequests: number;
}

// Tarjeta de acceso al área de ajustes en la barra lateral del dueño. Sustituye
// al panel de 11 atajos: la biblioteca queda en el menú de usuario y la red y
// la cuenta viven en `/me/settings`. El indicador de solicitudes es una
// bandeja de entrada, no una métrica de logro (spec social-profiles, "Panel
// del dueño").
export async function OwnerSettingsCard({ pendingRequests }: OwnerSettingsCardProps) {
  const t = await getTranslations("common");
  const tUsers = await getTranslations("users");

  return (
    <Link
      href="/me/settings"
      className="flex items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-3 transition-colors hover:border-amber"
    >
      <span className="min-w-0">
        <span className="block font-display text-sm text-paper">{t("settings")}</span>
        <span className="block truncate font-body text-xs text-paper-muted">{tUsers("ownerBar.settingsHint")}</span>
      </span>
      {pendingRequests > 0 && (
        <span className="shrink-0 rounded-sm bg-amber/15 px-1.5 py-0.5 font-data text-xs text-amber">
          {t("pendingFollowRequests", { count: pendingRequests })}
        </span>
      )}
    </Link>
  );
}
