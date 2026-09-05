import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFeed, listFeedAuthors } from "@/services/feed/feed";
import { FeedList } from "@/components/feed/FeedList";

export default async function FeedPage() {
  const t = await getTranslations("feed");
  const user = await requirePageUser();
  const [initial, authors] = await Promise.all([
    listFeed(user.id, 1, 20),
    listFeedAuthors(user.id),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <FeedList
        initial={initial}
        authors={authors}
        empty={{ title: t("emptyTitle"), description: t("emptyDescription") }}
      />
    </main>
  );
}