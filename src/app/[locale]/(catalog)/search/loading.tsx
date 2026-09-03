import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SearchLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <Skeleton
        variant="block"
        ariaLabel={t("loading.search")}
        className="h-12 w-full max-w-md"
      />
      <Skeleton variant="block" className="h-9 w-64" />
      <div className="flex flex-col gap-2">
        <Skeleton variant="block" className="h-16 w-full" />
        <Skeleton variant="block" className="h-16 w-full" />
        <Skeleton variant="block" className="h-16 w-full" />
      </div>
    </div>
  );
}
