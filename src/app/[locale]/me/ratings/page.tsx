import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyRatings } from "@/services/ratings/my-ratings";
import { MyRatingsFiltersSchema, type MyRatingsFilters } from "@/lib/api/schemas";
import { MyRatingsList } from "@/components/ratings/MyRatingsList";

type SearchParams = Record<string, string | string[] | undefined>;

function parseRatingsFilters(searchParams: SearchParams): MyRatingsFilters {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    return typeof value === "string" && value ? value : undefined;
  };
  const raw = {
    sort: pick("sort"),
    stars: pick("stars") ? Number(pick("stars")) : undefined,
    type: pick("type"),
    year: pick("year") ? Number(pick("year")) : undefined,
    decade: pick("decade") ? Number(pick("decade")) : undefined,
  };
  const parsed = MyRatingsFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export default async function RatingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("ratings");
  const user = await requirePageUser();
  const filters = parseRatingsFilters(await searchParams);
  const initial = await listMyRatings(user.id, 1, 20, filters);
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <MyRatingsList initial={initial} initialFilters={filters} />
    </main>
  );
}
