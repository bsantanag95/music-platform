import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { isEmailVerified } from "@/services/auth/email-verification";
import { countPendingFollowRequests } from "@/services/social/following";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SETTINGS_SCREENS } from "@/components/settings/settings-screens";
import { UnsavedChangesGuard } from "@/components/settings/UnsavedChangesGuard";
import { SettingsFocus } from "@/components/settings/SettingsFocus";

// Diseño compartido del área de ajustes (spec owner-settings): título, aviso de
// email sin verificar —visible en todas las pantallas, no solo en Cuenta, porque
// la de aterrizaje es Perfil (ver design.md, Decisión 2)— y el menú lateral.
// Cada pantalla vuelve a exigir sesión: un layout no se re-ejecuta al navegar
// entre sus páginas hijas, así que no basta como única guarda.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const pendingRequests = await countPendingFollowRequests(user.id);
  // Estado de la cuenta bajo cada entrada del menú, desde la fila de la sesión: sin consultas nuevas
  // (polish-settings-overview, D2).
  const statuses = {
    privacy: {
      text: t(user.profileVisibility === "private" ? "settings.status.private" : "settings.status.public"),
      tone: "muted" as const,
    },
    ...(user.notificationDigestEnabled
      ? { notifications: { text: t("settings.status.digest"), tone: "muted" as const } }
      : {}),
    ...(!isEmailVerified(user) ? { account: { text: t("settings.status.unverified"), tone: "warn" as const } } : {}),
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <h1 className="font-display text-2xl text-paper">{t("settings.title")}</h1>
        <EmailVerificationNotice verified={isEmailVerified(user)} />
        {/* Cambios sin guardar en cualquier pantalla: aviso antes de salir (refine-settings-editing, D3). */}
        <UnsavedChangesGuard>
          <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
            <SettingsNav screens={SETTINGS_SCREENS} badges={{ network: pendingRequests }} statuses={statuses} />
            <div className="min-w-0">{children}</div>
          </div>
        </UnsavedChangesGuard>
        <SettingsFocus />
      </div>
    </main>
  );
}
