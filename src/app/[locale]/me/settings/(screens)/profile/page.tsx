import { getLocale, getTranslations } from "next-intl/server";
import { genreLocaleOf } from "@/services/genres/names";
import { identityGenreLabels } from "@/services/genres/read";
import { requirePageUser } from "@/services/auth/page-auth";
import { getExtendedIdentity } from "@/services/profiles/identity";
import { getShowcase } from "@/services/profiles/showcase";
import { OwnerAvatarEditor } from "@/components/profiles/OwnerAvatarEditor";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerMusicIdentityEditor } from "@/components/profiles/OwnerMusicIdentityEditor";
import { OwnerPromptsEditor } from "@/components/profiles/OwnerPromptsEditor";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsEditorCard } from "@/components/settings/SettingsEditorCard";
import { SettingsSectionIndex } from "@/components/settings/SettingsSectionIndex";
import type { Metadata } from "next";
import { settingsMetadata } from "@/components/settings/settings-metadata";
import { withClientMessages } from "@/i18n/client-messages";

export async function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("profile");
}

// Pantalla Perfil (spec owner-settings): la identidad pública del dueño — la
// Tarjeta de Identidad, bio, pronombres, ubicación, zona horaria y hora local,
// identidad musical, preguntas y enlaces — con los mismos editores que abre el
// modo edición sobre el perfil.
async function ProfileSettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const locale = genreLocaleOf(await getLocale());
  const [identity, showcase] = await Promise.all([getExtendedIdentity(user.id), getShowcase(user.id)]);
  if (!identity) return null;
  // Los géneros que ya no son un estilo visible no figuran en las etiquetas y se ignoran al mostrar.
  const genreLabels = await identityGenreLabels(identity.genres, locale);
  // Índice de la pantalla: una entrada por tarjeta, en el orden de la página (refine-settings-editing, D2).
  const sections = {
    photo: t("settings.profile.index.photo"),
    card: t("settings.profile.index.card"),
    identity: t("settings.profile.index.identity"),
    music: t("settings.profile.index.music"),
    prompts: t("settings.profile.index.prompts"),
    links: t("settings.profile.index.links"),
  };

  return (
    <SettingsSection title={t("settings.profile.title")} intro={t("settings.profile.intro")}>
      <SettingsSectionIndex sections={Object.entries(sections).map(([id, label]) => ({ id, label }))} />
      <SettingsEditorCard id="photo" label={sections.photo}>
        <OwnerAvatarEditor
          username={identity.username}
          name={identity.displayName ?? identity.username}
          initialAvatarUrl={identity.avatarUrl}
        />
      </SettingsEditorCard>
      <SettingsEditorCard id="card" label={sections.card}>
        <OwnerIdentityCardEditor initial={showcase.identityCard} />
      </SettingsEditorCard>
      <SettingsEditorCard id="identity" label={sections.identity}>
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
      </SettingsEditorCard>
      <SettingsEditorCard id="music" label={sections.music}>
        <OwnerMusicIdentityEditor
          initial={{
            selfRoles: identity.selfRoles,
            genres: identity.genres.filter((slug) => slug in genreLabels),
            listeningFormats: identity.listeningFormats,
          }}
          genreLabels={genreLabels}
        />
      </SettingsEditorCard>
      <SettingsEditorCard id="prompts" label={sections.prompts}>
        <OwnerPromptsEditor initial={identity.prompts} />
      </SettingsEditorCard>
      <SettingsEditorCard id="links" label={sections.links}>
        <OwnerLinksEditor initialLinks={identity.links} />
      </SettingsEditorCard>
    </SettingsSection>
  );
}

export default withClientMessages("me/settings/(screens)/profile/page", ProfileSettingsPage);
