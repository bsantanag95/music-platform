import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { listOwnCollection } from "@/services/collection/collection";
import { listOwnWanted } from "@/services/collection/wanted";
import { parseCollectionFilters } from "@/lib/api/collection-filters";
import { parseWantedFilters } from "@/lib/api/wanted-filters";
import { CollectionShelf } from "@/components/collection/CollectionShelf";
import { WantedShelf } from "@/components/collection/WantedShelf";

type SearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  return params;
}

function tabClasses(active: boolean): string {
  return `rounded border px-3 py-1.5 font-data text-xs transition-colors ${
    active
      ? "border-amber bg-amber/10 text-amber"
      : "border-ink-border text-paper-muted hover:text-paper"
  }`;
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

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>

      <div role="tablist" aria-label={t("title")} className="flex gap-1.5">
        <Link href="/me/collection" role="tab" aria-selected={tab === "own"} className={tabClasses(tab === "own")}>
          {t("tabHave")}
        </Link>
        <Link
          href="/me/collection?tab=wanted"
          role="tab"
          aria-selected={tab === "wanted"}
          className={tabClasses(tab === "wanted")}
        >
          {t("tabWant")}
        </Link>
      </div>

      {tab === "wanted" ? (
        <WantedShelfSection userId={user.id} params={params} />
      ) : (
        <CollectionShelfSection userId={user.id} params={params} />
      )}
    </main>
  );
}

async function CollectionShelfSection({ userId, params }: { userId: string; params: URLSearchParams }) {
  const filters = parseCollectionFilters(params);
  const initial = await listOwnCollection(userId, 1, 20, filters);
  return <CollectionShelf initial={initial} initialFilters={filters} />;
}

async function WantedShelfSection({ userId, params }: { userId: string; params: URLSearchParams }) {
  const filters = parseWantedFilters(params);
  const initial = await listOwnWanted(userId, 1, 20, filters);
  return <WantedShelf initial={initial} initialFilters={filters} />;
}
