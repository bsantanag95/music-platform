import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

// Espeja el ritmo real de la página resuelta: breadcrumb, título, formulario,
// y una lista densa con la celda de disco a la izquierda y dos líneas de texto.
export default async function SearchLoading() {
  const t = await getTranslations("common");

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12"
      aria-busy="true"
    >
      <Skeleton variant="block" className="h-3 w-40" />
      <Skeleton variant="block" className="h-8 w-64" />

      <div className="flex w-full max-w-md flex-col gap-4">
        <Skeleton variant="block" className="h-16 w-full" />
        <Skeleton variant="block" className="h-10 w-full" />
      </div>

      <div className="flex w-full flex-col gap-4">
        <Skeleton
          variant="block"
          ariaLabel={t("loading.search")}
          className="h-6 w-56"
        />
        <div className="flex gap-2">
          <Skeleton variant="block" className="h-7 w-16" />
          <Skeleton variant="block" className="h-7 w-24" />
          <Skeleton variant="block" className="h-7 w-24" />
        </div>
        <ul className="flex flex-col divide-y divide-ink-border">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} className="flex gap-3 py-3 first:pt-0">
              <Skeleton variant="disc" className="size-10 shrink-0" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton variant="block" className="h-4 w-40" />
                <Skeleton variant="block" className="h-3 w-24" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
