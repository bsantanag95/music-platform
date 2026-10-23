import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getNotificationPreferences } from "@/services/notifications/preferences";
import { NotificationPreferencesForm } from "@/components/notifications/NotificationPreferencesForm";
import { SettingsCard, SettingsSection } from "@/components/settings/SettingsSection";

// Pantalla Notificaciones del área de ajustes (openspec: add-notifications-core,
// D9): un interruptor por tipo desactivable y los tipos fijos con su explicación.
export default async function NotificationSettingsPage() {
  const t = await getTranslations("notifications");
  const user = await requirePageUser();
  const preferences = await getNotificationPreferences(user.id);

  return (
    <SettingsSection title={t("settings.title")} intro={t("settings.intro")}>
      <SettingsCard>
        <NotificationPreferencesForm initial={preferences} />
      </SettingsCard>
    </SettingsSection>
  );
}
