import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyFavorites } from "@/services/favorites/favorites";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export default async function FavoritesPage() {
  const t = await getTranslations("favorites");
  const user = await requirePageUser();
  const initial = await listMyFavorites(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <FavoritesList initial={initial} />
    </main>
  );
}