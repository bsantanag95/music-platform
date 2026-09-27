import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

// Esqueleto con la forma de la ficha de canción (openspec: redesign-song-page): carátula,
// identidad y panel en la cabecera, la tira de pistas y los bloques de créditos.
export default async function SongLoading() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_18rem]">
        <Skeleton variant="disc" className="size-32 sm:size-[160px] lg:size-[200px]" />
        <div className="flex flex-col gap-3">
          <Skeleton ariaLabel={t("loading.song")} className="h-4 w-40" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
