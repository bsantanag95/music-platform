import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

// Espeja el ritmo real de la página resuelta con consulta (openspec: redesign-search-phase1): marco de 88rem, migas,
// campo grande, pestañas y, desde `lg`, resultados en 8 columnas con la columna lateral a la derecha. Mismo marco que
// la página: con otro, todo saltaba al llegar.
export default async function SearchLoading() {
  const t = await getTranslations("common");

  return (
    <div
      className="mx-auto flex w-full max-w-[88rem] flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8 xl:px-12"
      aria-busy="true"
    >
      <Skeleton variant="block" className="h-3 w-40" />

      <Skeleton variant="block" className="h-[3.375rem] w-full max-w-[54rem] sm:h-16" />

      <div className="grid w-full grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8 xl:gap-x-16">
        <div className="flex gap-2 lg:col-span-12">
          <Skeleton variant="block" ariaLabel={t("loading.search")} className="h-10 w-28 rounded-full" />
          <Skeleton variant="block" className="h-10 w-24 rounded-full" />
          <Skeleton variant="block" className="h-10 w-28 rounded-full" />
        </div>
        <Skeleton variant="block" className="hidden h-48 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:block" />
        <ul className="flex flex-col divide-y divide-ink-border lg:col-span-8 lg:col-start-1 lg:row-start-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <li key={row} className="flex gap-3 py-3 first:pt-0">
              <Skeleton variant="disc" className="size-12 shrink-0" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton variant="block" className="h-4 w-48" />
                <Skeleton variant="block" className="h-3 w-28" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
