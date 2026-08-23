import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFeed } from "@/services/diary/diary";
import { DiaryList } from "@/components/diary/DiaryList";

export default async function FeedPage() {
  const t = await getTranslations("feed");
  const user = await requirePageUser();
  const initial = await listFeed(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <DiaryList
        initial={initial}
        readOnly
        showAuthor
        empty={{ title: t("emptyTitle"), description: t("emptyDescription") }}
      />
    </main>
  );
}
