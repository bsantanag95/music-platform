import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import { getAccessMethod } from "@/services/profiles/account-settings";
import { DisplayNameForm } from "@/components/settings/DisplayNameForm";
import { RevokeSessionsButton } from "@/components/settings/RevokeSessionsButton";
import { SettingsCard, SettingsSection } from "@/components/settings/SettingsSection";

// Nombres propios de los proveedores de acceso; uno desconocido se muestra tal cual.
const PROVIDER_NAMES: Record<string, string> = { google: "Google" };

// Pantalla Cuenta y seguridad (spec owner-settings): nombre visible, método de
// acceso en solo lectura y cierre de todas las sesiones. Nada de esto se
// muestra a otras personas. No ofrece controles de funciones que todavía no
// existen (cambiar email, usuario o contraseña, foto, eliminar cuenta).
export default async function AccountSettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const [profile, access] = await Promise.all([getOwnProfile(user.id), getAccessMethod(user.id)]);

  // El método de acceso nunca incluye el hash: solo si hay contraseña local y
  // qué proveedores externos hay vinculados.
  const methods = [
    ...(access.hasPassword ? [t("settings.account.access.password")] : []),
    ...access.providers.map((provider) => PROVIDER_NAMES[provider] ?? provider),
  ];

  return (
    <SettingsSection title={t("settings.account.title")} intro={t("settings.account.intro")}>
      <SettingsCard>
        <h3 className="mb-4 font-display text-sm text-paper-muted">{t("settings.account.displayName.title")}</h3>
        <DisplayNameForm initialDisplayName={profile.displayName} username={profile.username} />
      </SettingsCard>

      <SettingsCard>
        <h3 className="mb-1 font-display text-sm text-paper-muted">{t("settings.account.access.title")}</h3>
        <p className="mb-3 font-body text-xs text-paper-muted">{t("settings.account.access.hint")}</p>
        {methods.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {methods.map((method) => (
              <li
                key={method}
                className="rounded-full border border-ink-border px-3 py-1 font-display text-sm text-paper"
              >
                {method}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-sm text-paper-muted">{t("settings.account.access.none")}</p>
        )}
      </SettingsCard>

      <SettingsCard>
        <h3 className="mb-1 font-display text-sm text-paper-muted">{t("settings.account.sessions.title")}</h3>
        <p className="mb-4 font-body text-xs text-paper-muted">{t("settings.account.sessions.hint")}</p>
        <RevokeSessionsButton />
      </SettingsCard>
    </SettingsSection>
  );
}
