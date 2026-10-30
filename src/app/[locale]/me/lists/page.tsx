import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { countMyListsByType, listMyLists, type ListTypeCounts } from "@/services/lists/lists";
import { countSavedListsByType, listSavedLists } from "@/services/lists/saved-lists";
import { ListsSection } from "@/components/lists/ListsSection";
import { parseListsTab } from "@/components/lists/lists-tabs";
import { MyListsTab } from "@/components/lists/MyListsTab";
import { SavedListsTab } from "@/components/lists/SavedListsTab";
import { ListEntityTypeSchema, ListSortSchema } from "@/lib/api/schemas";
import { withClientMessages } from "@/i18n/client-messages";

// Filtros de la pestaña leídos de la URL (los escribe `useListFilters`); un valor inválido se ignora.
function parseListFiltersParams(raw: { q?: string | string[]; type?: string | string[]; sort?: string | string[] }) {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const q = one(raw.q)?.trim().slice(0, 100) || undefined;
  const entityType = ListEntityTypeSchema.safeParse(one(raw.type)).data;
  const sort = ListSortSchema.safeParse(one(raw.sort)).data;
  return { q, entityType, sort };
}

const sum = (counts: ListTypeCounts) => counts.artist + counts["release-group"] + counts.recording;

async function ListsPage({
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
  const user = await requirePageUser();
  const { tab: rawTab, new: rawNew, ...rawFilters } = await searchParams;
  // Descubrir vive en Comunidad (openspec: redesign-me-lists-toolbar, D5): un enlace viejo a la pestaña lleva allá.
  if (rawTab === "discover") redirect({ href: "/lists", locale: await getLocale() });
  const tab = parseListsTab(rawTab);
  const filters = parseListFiltersParams(rawFilters);
  const initialFilters = { q: filters.q ?? "", entityType: filters.entityType ?? "", sort: filters.sort ?? "recent" } as const;

  let panel;
  let totals;
  if (tab === "saved") {
    const [initial, mine] = await Promise.all([listSavedLists(user.id, 1, 20, filters), countMyListsByType(user.id)]);
    panel = <SavedListsTab initial={initial} initialFilters={initialFilters} />;
    totals = { mine: sum(mine), saved: sum(initial.counts) };
  } else {
    const [initial, saved] = await Promise.all([listMyLists(user.id, 1, 20, filters), countSavedListsByType(user.id)]);
    panel = <MyListsTab initial={initial} initialFilters={initialFilters} ownerUsername={user.username} />;
    totals = { mine: sum(initial.counts), saved: sum(saved) };
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      {/* `?new=1` (el botón "Crear lista" de `/lists`) abre el diálogo de nueva lista al cargar. */}
      <ListsSection activeTab={tab} initialTotals={totals} initialNewListOpen={rawNew === "1"}>
        {panel}
      </ListsSection>
    </main>
  );
}

export default withClientMessages("me/lists/page", ListsPage);
