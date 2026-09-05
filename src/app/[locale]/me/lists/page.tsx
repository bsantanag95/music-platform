import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyLists } from "@/services/lists/lists";
import { listSavedLists } from "@/services/lists/saved-lists";
import { listDiscoverLists } from "@/services/lists/discovery";
import { ListsSection, parseListsTab } from "@/components/lists/ListsSection";
import { MyListsTab } from "@/components/lists/MyListsTab";
import { SavedListsTab } from "@/components/lists/SavedListsTab";
import { DiscoverListsTab } from "@/components/lists/DiscoverListsTab";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const t = await getTranslations("lists");
  const user = await requirePageUser();
  const tab = parseListsTab((await searchParams).tab);

  let panel;
  if (tab === "saved") {
    panel = <SavedListsTab initial={await listSavedLists(user.id, 1, 20)} />;
  } else if (tab === "discover") {
    panel = <DiscoverListsTab initial={await listDiscoverLists(user.id, 1, 20)} />;
  } else {
    panel = <MyListsTab initial={await listMyLists(user.id, 1, 20)} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <ListsSection activeTab={tab}>{panel}</ListsSection>
    </main>
  );
}
