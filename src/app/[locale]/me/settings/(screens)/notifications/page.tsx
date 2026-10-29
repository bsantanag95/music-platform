import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getNotificationSettings } from "@/services/notifications/preferences";
import { NotificationPreferencesForm } from "@/components/notifications/NotificationPreferencesForm";
import { SettingsCard, SettingsSection } from "@/components/settings/SettingsSection";
import type { Metadata } from "next";
import { settingsMetadata } from "@/components/settings/settings-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("notifications");
}

// Pantalla Notificaciones del área de ajustes (openspec: add-notifications-core,
// D9; add-notification-digest-and-awards, D8): un interruptor por tipo
// desactivable, los tipos fijos con su explicación y el opt-in del resumen
// semanal por email.
export default async function NotificationSettingsPage() {
  const t = await getTranslations("notifications");
  const user = await requirePageUser();
  const settings = await getNotificationSettings(user.id);

  return (
    <SettingsSection title={t("settings.title")} intro={t("settings.intro")}>
      <SettingsCard>
        <NotificationPreferencesForm initial={settings} />
      </SettingsCard>
    </SettingsSection>
  );
}
