import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyLists } from "@/services/lists/lists";
import { ListsList } from "@/components/lists/ListsList";

export default async function ListsPage() {
  const t = await getTranslations("lists");
  const user = await requirePageUser();
  const initial = await listMyLists(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <ListsList initial={initial} />
    </main>
  );
}