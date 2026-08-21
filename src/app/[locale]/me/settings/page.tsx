import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnProfile } from "@/services/social/profiles";
import { PrivacySettings } from "@/components/social/PrivacySettings";

export default async function PrivacySettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const profile = await getOwnProfile(user.id);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("profileVisibilityLabel")}</h1>
      <PrivacySettings initialVisibility={profile.profileVisibility} />
    </main>
  );
}