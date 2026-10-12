import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/services/auth/page-auth";
import { getUserPermissions } from "@/services/auth/authorization";
import { listEditorialLists } from "@/services/lists/editorial";
import { EditorialConsole } from "@/components/admin/EditorialConsole";
import { listEligibleForFeature, listFeaturedAdmin, listTemplatesAdmin } from "@/services/discovery/featured";
import {
  EditorialListsResponseSchema,
  FeaturedAdminResponseSchema,
  TemplatesAdminResponseSchema,
} from "@/lib/api/schemas";

export default async function AdminPage() {
  const t = await getTranslations("common.adminConsole");
  const user = await requirePagePermission("editorial.author");
  const permissions = await getUserPermissions(user.id);
  const [lists, featured, eligible, templates] = await Promise.all([
    listEditorialLists(),
    listFeaturedAdmin(),
    listEligibleForFeature(),
    listTemplatesAdmin(),
  ]);
  const initial = EditorialListsResponseSchema.parse({ lists });
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <header className="w-full max-w-4xl">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("description")}</p>
      </header>
      <EditorialConsole
        initial={initial}
        permissions={permissions}
        featured={FeaturedAdminResponseSchema.parse({ featured, eligible })}
        templates={TemplatesAdminResponseSchema.parse({ templates })}
      />
    </main>
  );
}
