import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyLists } from "@/services/lists/lists";
import { listSavedLists } from "@/services/lists/saved-lists";
import { listDiscoverLists } from "@/services/lists/discovery";
import { ListsSection } from "@/components/lists/ListsSection";
import { parseListsTab } from "@/components/lists/lists-tabs";
import { MyListsTab } from "@/components/lists/MyListsTab";
import { SavedListsTab } from "@/components/lists/SavedListsTab";
import { DiscoverListsTab } from "@/components/lists/DiscoverListsTab";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; new?: string | string[] }>;
}) {
  const t = await getTranslations("lists");
  const user = await requirePageUser();
  const { tab: rawTab, new: rawNew } = await searchParams;
  const tab = parseListsTab(rawTab);
  // `?new=1` (el botón "Crear lista" de `/lists`) abre el formulario de nueva lista ya desplegado.
  const openForm = rawNew === "1";

  let panel;
  if (tab === "saved") {
    panel = <SavedListsTab initial={await listSavedLists(user.id, 1, 20)} />;
  } else if (tab === "discover") {
    panel = <DiscoverListsTab initial={await listDiscoverLists(user.id, 1, 20)} />;
  } else {
    panel = <MyListsTab initial={await listMyLists(user.id, 1, 20)} initialShowForm={openForm} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <ListsSection activeTab={tab}>{panel}</ListsSection>
    </main>
  );
}
