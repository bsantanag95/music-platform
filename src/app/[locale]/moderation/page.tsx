import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/services/auth/page-auth";
import { listModerationReports } from "@/services/moderation-queries";
import { listSocialRestrictions } from "@/services/moderation-queries";
import { ModerationConsole } from "@/components/moderation/ModerationConsole";
import { ModerationReportsResponseSchema, SocialRestrictionsResponseSchema } from "@/lib/api/schemas";

export default async function ModerationPage() {
  const t = await getTranslations("common.moderationConsole");
  await requirePagePermission("moderation.review_content");
  const initial = ModerationReportsResponseSchema.parse(
    await listModerationReports({ status: "pending", page: 1, pageSize: 20 }),
  );
  const initialRestrictions = SocialRestrictionsResponseSchema.parse({ restrictions: await listSocialRestrictions() }).restrictions;
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <header className="w-full max-w-4xl">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("description")}</p>
      </header>
      <ModerationConsole initial={initial} initialRestrictions={initialRestrictions} />
    </main>
  );
}
