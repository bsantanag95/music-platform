import { getTimeZone, getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyDiary } from "@/services/diary/diary";
import { DiaryActivityList } from "@/components/diary/DiaryActivityList";
import { LogListenButton } from "@/components/diary/LogListenButton";

export default async function DiaryPage() {
  const t = await getTranslations("diary");
  const user = await requirePageUser();
  // La página 1 se siembra en la misma zona horaria con la que el cliente
  // agrupa por mes y filtra (openspec: redesign-diary-page, D1).
  const timeZone = await getTimeZone();
  const initial = await listMyDiary(user.id, 1, 20, { timeZone });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-12">
      {/* Cabecera con punto de partida (openspec: redesign-diary-page, D5). */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
          <p className="mt-1 font-body text-sm text-paper-muted">{t("subtitle")}</p>
        </div>
        <LogListenButton />
      </header>
      <DiaryActivityList initial={initial} />
    </main>
  );
}
