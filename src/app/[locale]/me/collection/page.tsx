import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listOwnCollection } from "@/services/collection/collection";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { CollectionShelf } from "@/components/collection/CollectionShelf";

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
  const filters = parseCollectionFilters(toURLSearchParams(await searchParams));
  const initial = await listOwnCollection(user.id, 1, 20, filters);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <CollectionShelf initial={initial} initialFilters={filters} />
    </main>
  );
}
