import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SearchLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-col gap-4">
        <Skeleton
          variant="block"
          ariaLabel={t("loading.search")}
          className="h-12 w-full"
        />
        <Skeleton variant="block" className="h-4 w-3/4" />
      </div>
    </div>
  );
}
