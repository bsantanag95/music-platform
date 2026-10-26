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
import { ListEntityTypeSchema, ListSortSchema } from "@/lib/api/schemas";

// Filtros de Mis listas leídos de la URL (los escribe `useListFilters`); un valor inválido se ignora.
function parseMyListsFilters(raw: { q?: string | string[]; type?: string | string[]; sort?: string | string[] }) {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const q = one(raw.q)?.trim().slice(0, 100) || undefined;
  const entityType = ListEntityTypeSchema.safeParse(one(raw.type)).data;
  const sort = ListSortSchema.safeParse(one(raw.sort)).data;
  return { q, entityType, sort };
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    new?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const t = await getTranslations("lists");
  const user = await requirePageUser();
  const { tab: rawTab, new: rawNew, ...rawFilters } = await searchParams;
  const tab = parseListsTab(rawTab);
  // `?new=1` (el botón "Crear lista" de `/lists`) abre el formulario de nueva lista ya desplegado.
  const openForm = rawNew === "1";

  let panel;
  if (tab === "saved") {
    panel = <SavedListsTab initial={await listSavedLists(user.id, 1, 20)} />;
  } else if (tab === "discover") {
    panel = <DiscoverListsTab initial={await listDiscoverLists(user.id, 1, 20)} />;
  } else {
    const filters = parseMyListsFilters(rawFilters);
    panel = (
      <MyListsTab
        initial={await listMyLists(user.id, 1, 20, filters)}
        initialShowForm={openForm}
        initialFilters={{ q: filters.q ?? "", entityType: filters.entityType ?? "", sort: filters.sort ?? "recent" }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("description")}</p>
      </header>
      <ListsSection activeTab={tab}>{panel}</ListsSection>
    </main>
  );
}
