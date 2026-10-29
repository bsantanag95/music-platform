import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { isEmailVerified } from "@/services/auth/email-verification";
import { countPendingFollowRequests } from "@/services/social/following";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SETTINGS_SCREENS } from "@/components/settings/settings-screens";

// Diseño compartido del área de ajustes (spec owner-settings): título, aviso de
// email sin verificar —visible en todas las pantallas, no solo en Cuenta, porque
// la de aterrizaje es Perfil (ver design.md, Decisión 2)— y el menú lateral.
// Cada pantalla vuelve a exigir sesión: un layout no se re-ejecuta al navegar
// entre sus páginas hijas, así que no basta como única guarda.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const pendingRequests = await countPendingFollowRequests(user.id);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <h1 className="font-display text-2xl text-paper">{t("settings.title")}</h1>
        <EmailVerificationNotice verified={isEmailVerified(user)} />
        <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
          <SettingsNav screens={SETTINGS_SCREENS} badges={{ network: pendingRequests }} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
