import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/Skeleton";

// Espeja la página resuelta: marco de 88rem con el contenido a su ancho de lectura (redesign-advanced-search-phase1),
// breadcrumb, título, pestañas, el formulario en dos columnas y una lista densa de resultados.
export default async function AdvancedSearchLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto w-full max-w-[88rem] px-4 pb-16 pt-10 sm:px-8 xl:px-12" aria-busy="true">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <Skeleton variant="block" className="h-3 w-56" />
        <Skeleton variant="block" className="h-8 w-64" />

        <div className="flex w-full flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton variant="block" className="h-9 w-28" />
            <Skeleton variant="block" className="h-9 w-28" />
            <Skeleton variant="block" className="h-9 w-28" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <Skeleton key={field} variant="block" className="h-16 w-full" />
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Skeleton variant="block" ariaLabel={t("loading.search")} className="h-6 w-40" />
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
    </div>
  );
}
