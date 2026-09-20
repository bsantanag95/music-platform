import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import { PrivacySettings } from "@/components/social/PrivacySettings";
import { SettingsSection } from "@/components/settings/SettingsSection";

// Pantalla Privacidad y audiencia (spec owner-settings): la visibilidad del
// perfil. La audiencia por defecto del contenido nuevo se suma en la Fase 2
// (spec default-audience).
export default async function PrivacySettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const profile = await getOwnProfile(user.id);

  return (
    <SettingsSection title={t("settings.privacy.title")} intro={t("settings.privacy.intro")}>
      <PrivacySettings initialVisibility={profile.profileVisibility} />
    </SettingsSection>
  );
}
