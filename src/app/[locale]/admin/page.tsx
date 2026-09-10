import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/services/auth/page-auth";
import { listEditorialLists } from "@/services/lists/editorial";
import { EditorialConsole } from "@/components/admin/EditorialConsole";
import { EditorialListsResponseSchema } from "@/lib/api/schemas";

export default async function AdminPage() {
  const t = await getTranslations("common.adminConsole");
  await requirePagePermission("editorial.publish");
  const initial = EditorialListsResponseSchema.parse({ lists: await listEditorialLists() });
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <header className="w-full max-w-4xl">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("description")}</p>
      </header>
      <EditorialConsole initial={initial} />
    </main>
  );
}
