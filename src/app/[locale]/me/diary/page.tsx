import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyDiary } from "@/services/diary/diary";
import { DiaryList } from "@/components/diary/DiaryList";

export default async function DiaryPage() {
  const t = await getTranslations("diary");
  const user = await requirePageUser();
  const initial = await listMyDiary(user.id, 1, 20);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      <DiaryList initial={initial} />
    </main>
  );
}