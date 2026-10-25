import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { countOwnCollection, listOwnCollection } from "@/services/collection/collection";
import { countOwnWanted, listOwnWanted } from "@/services/collection/wanted";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { parseWantedFilters } from "@/lib/api/wanted-filters";
import { CollectionShelf } from "@/components/collection/CollectionShelf";
import { WantedShelf } from "@/components/collection/WantedShelf";
import { CollectionTabs } from "@/components/collection/CollectionTabs";
import { AddCopyButton } from "@/components/collection/AddCopyButton";

type SearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  return params;
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("collection");
  const user = await requirePageUser();
  const params = toURLSearchParams(await searchParams);
  const tab = params.get("tab") === "wanted" ? "wanted" : "own";

  // La pestaña abierta trae su primera página (con su total); de la otra solo hace falta la cifra.
  let shelf: React.ReactNode;
  let totals: { own: number; wanted: number };
  if (tab === "wanted") {
    const filters = parseWantedFilters(params);
    const [initial, own] = await Promise.all([listOwnWanted(user.id, 1, 20, filters), countOwnCollection(user.id)]);
    shelf = <WantedShelf initial={initial} initialFilters={filters} />;
    totals = { own, wanted: initial.total };
  } else {
    const filters = parseCollectionFilters(params);
    const [initial, wanted] = await Promise.all([
      listOwnCollection(user.id, 1, 20, filters),
      countOwnWanted(user.id),
    ]);
    shelf = <CollectionShelf initial={initial} initialFilters={filters} />;
    totals = { own: initial.total ?? 0, wanted };
  }

  return (
    // Mismo ancho y título a la izquierda que Calificaciones, Favoritos, Diario y Pendientes.
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
          <p className="font-body text-sm text-paper-muted">{t("description")}</p>
        </div>
        {tab === "own" ? <AddCopyButton /> : null}
      </header>

      <CollectionTabs active={tab} initialTotals={totals}>
        {shelf}
      </CollectionTabs>
    </main>
  );
}
