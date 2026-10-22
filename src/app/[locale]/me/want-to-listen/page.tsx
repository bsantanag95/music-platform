import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyWantToListen } from "@/services/want-to-listen/want-to-listen";
import { WantToListenFiltersSchema, type WantToListenFilters } from "@/lib/api/schemas";
import { AddPendingButton } from "@/components/want-to-listen/AddPendingButton";
import { WantToListenList } from "@/components/want-to-listen/WantToListenList";

type SearchParams = Record<string, string | string[] | undefined>;

// Tipo y orden desde la URL; un valor inválido se ignora (la página abre igual, con el defecto).
function parseWantToListenFilters(searchParams: SearchParams): WantToListenFilters {
  const pick = (key: string): string | undefined => {
    const value = searchParams[key];
    return typeof value === "string" && value ? value : undefined;
  };
  const type = WantToListenFiltersSchema.shape.type.safeParse(pick("type"));
  const sort = WantToListenFiltersSchema.shape.sort.safeParse(pick("sort"));
  return {
    ...(type.success && type.data ? { type: type.data } : {}),
    ...(sort.success && sort.data ? { sort: sort.data } : {}),
  };
}

export default async function WantToListenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("wantToListen");
  const user = await requirePageUser();
  const filters = parseWantToListenFilters(await searchParams);
  const initial = await listMyWantToListen(user.id, 1, 20, filters);

  // Un solo ancho para los tres modos (4xl, como Calificaciones y Favoritos) y la cabecera alineada con
  // el contenido: cambiar de modo no la mueve. El listado llena su contenedor.
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
          <p className="font-body text-sm text-paper-muted">{t("description")}</p>
        </div>
        <AddPendingButton />
      </header>
      <WantToListenList initial={initial} initialFilters={filters} />
    </main>
  );
}
