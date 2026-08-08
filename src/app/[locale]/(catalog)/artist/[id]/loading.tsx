import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function ArtistLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton
            variant="disc"
            ariaLabel={t("loading.artist")}
            className="h-32 w-32 shrink-0 sm:h-40 sm:w-40"
          />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton variant="block" className="h-8 w-2/3" />
            <Skeleton variant="block" className="h-4 w-1/2" />
            <Skeleton variant="block" className="h-20 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton variant="block" className="h-6 w-32" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton
                  variant="disc"
                  className="aspect-square w-full"
                />
                <Skeleton variant="block" className="h-4 w-full" />
                <Skeleton variant="block" className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
