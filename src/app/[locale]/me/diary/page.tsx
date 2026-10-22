import { getTimeZone, getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyDiary } from "@/services/diary/diary";
import { DiaryActivityList } from "@/components/diary/DiaryActivityList";
import { LogListenButton } from "@/components/diary/LogListenButton";
import { filtersFromSearchParams, toApiFilters } from "@/components/diary/diary-filters";

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("diary");
  const user = await requirePageUser();
  // La página 1 se siembra en la misma zona horaria con la que el cliente
  // agrupa por mes y filtra (openspec: redesign-diary-page, D1).
  const timeZone = await getTimeZone();
  // Los filtros de la URL siembran la primera página (D7); los valores
  // inválidos se ignoran en vez de propagar el 400 de la API.
  const initialFilters = filtersFromSearchParams(await searchParams);
  const initial = await listMyDiary(user.id, 1, 20, { ...toApiFilters(initialFilters), timeZone });

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
      <DiaryActivityList initial={initial} initialFilters={initialFilters} />
    </main>
  );
}
