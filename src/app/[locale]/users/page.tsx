import { getTranslations } from "next-intl/server";
import { UserSearch } from "@/components/social/UserSearch";
import { resolveSession } from "@/services/auth/sessions";

export default async function UsersPage() {
  const t = await getTranslations("users");
  const session = await resolveSession();

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("searchTitle")}</h1>
      <p className="font-body text-sm text-paper-muted">{t("searchDescription")}</p>
      <UserSearch authenticated={Boolean(session)} />
    </main>
  );
}