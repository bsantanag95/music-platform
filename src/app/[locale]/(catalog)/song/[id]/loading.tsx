import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SongLoading() { const t = await getTranslations("common"); return <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12"><Skeleton ariaLabel={t("loading.song")} className="h-10 w-2/3" /><Skeleton className="h-5 w-32" /><Skeleton className="h-32 w-full" /></main>; }
