import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyFavorites } from "@/services/favorites/favorites";
import { FavoritesFiltersSchema, type FavoritesFilters } from "@/lib/api/schemas";
import { FavoritesWall } from "@/components/favorites/FavoritesWall";

type SearchParams = Record<string, string | string[] | undefined>;

function parseFavoritesFilters(searchParams: SearchParams): FavoritesFilters {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    return typeof value === "string" && value ? value : undefined;
  };
  const parsed = FavoritesFiltersSchema.safeParse({
    q: pick("q"),
    type: pick("type"),
    audience: pick("audience"),
    sort: pick("sort"),
  });
  return parsed.success ? parsed.data : {};
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("favorites");
  const user = await requirePageUser();
  const filters = parseFavoritesFilters(await searchParams);
  const initial = await listMyFavorites(user.id, 1, 20, filters);

  // Un solo ancho para los tres modos (4xl) y el título alineado con el contenido: cambiar de modo no
  // mueve la cabecera ni la barra. El muro llena su contenedor; el perfil público pone el suyo.
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <FavoritesWall initial={initial} initialFilters={filters} />
    </main>
  );
}
