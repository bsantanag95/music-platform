import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFollowedArtists } from "@/services/social/artist-following";
import { FollowedArtistList } from "@/components/catalog/FollowedArtistList";

export default async function FollowedArtistsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const { artists } = await listFollowedArtists(user.id, 1, 50);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("artistsFollowedTitle")}</h1>
      <FollowedArtistList initial={artists} />
    </main>
  );
}
