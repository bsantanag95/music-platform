import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import { PrivacySettings } from "@/components/social/PrivacySettings";
import { DefaultAudienceSettings } from "@/components/settings/DefaultAudienceSettings";
import { SettingsCard, SettingsSection } from "@/components/settings/SettingsSection";

// Pantalla Privacidad y audiencia (spec owner-settings): la visibilidad del
// perfil y la audiencia por defecto del contenido nuevo (spec default-audience).
export default async function PrivacySettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const profile = await getOwnProfile(user.id);

  return (
    <SettingsSection title={t("settings.privacy.title")} intro={t("settings.privacy.intro")}>
      <SettingsCard>
        <PrivacySettings initialVisibility={profile.profileVisibility} />
      </SettingsCard>
      <SettingsCard>
        <DefaultAudienceSettings initialAudience={profile.defaultAudience} />
      </SettingsCard>
    </SettingsSection>
  );
}
