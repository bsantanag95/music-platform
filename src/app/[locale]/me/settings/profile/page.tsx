import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getExtendedIdentity } from "@/services/profiles/identity";
import { getShowcase } from "@/services/profiles/showcase";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerMusicIdentityEditor } from "@/components/profiles/OwnerMusicIdentityEditor";
import { OwnerPromptsEditor } from "@/components/profiles/OwnerPromptsEditor";
import { SettingsCard, SettingsSection } from "@/components/settings/SettingsSection";

// Pantalla Perfil (spec owner-settings): la identidad pública del dueño — la
// Tarjeta de Identidad, bio, pronombres, ubicación, zona horaria y hora local,
// identidad musical, preguntas y enlaces — con los mismos editores que abre el
// modo edición sobre el perfil.
export default async function ProfileSettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const [identity, showcase] = await Promise.all([getExtendedIdentity(user.id), getShowcase(user.id)]);
  if (!identity) return null;

  return (
    <SettingsSection title={t("settings.profile.title")} intro={t("settings.profile.intro")}>
      <SettingsCard>
        <OwnerIdentityCardEditor initial={showcase.identityCard} />
      </SettingsCard>
      <SettingsCard>
        <OwnerIdentityEditor
          name={identity.displayName ?? identity.username}
          initial={{
            bio: identity.bio,
            pronouns: identity.pronouns,
            pronounSet: identity.pronounSet,
            country: identity.country,
            location: identity.location,
            timezone: identity.timezone,
            showLocalTime: identity.showLocalTime,
          }}
        />
      </SettingsCard>
      <SettingsCard>
        <OwnerMusicIdentityEditor
          initial={{
            selfRoles: identity.selfRoles,
            genres: identity.genres,
            listeningFormats: identity.listeningFormats,
          }}
        />
      </SettingsCard>
      <SettingsCard>
        <OwnerPromptsEditor initial={identity.prompts} />
      </SettingsCard>
      <SettingsCard>
        <OwnerLinksEditor initialLinks={identity.links} />
      </SettingsCard>
    </SettingsSection>
  );
}
