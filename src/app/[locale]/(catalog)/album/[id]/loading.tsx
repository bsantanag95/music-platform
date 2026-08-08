import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function AlbumLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Skeleton
            variant="disc"
            ariaLabel={t("loading.album")}
            className="aspect-square w-full max-w-[200px] shrink-0 sm:w-[200px]"
          />
          <div className="flex flex-1 flex-col justify-end gap-2">
            <Skeleton variant="block" className="h-4 w-24" />
            <Skeleton variant="block" className="h-8 w-full" />
            <Skeleton variant="block" className="h-4 w-32" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-6 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton variant="block" className="h-4 w-8" />
                <Skeleton variant="block" className="h-4 flex-1" />
                <Skeleton variant="block" className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
