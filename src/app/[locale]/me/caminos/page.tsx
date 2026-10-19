import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { progressHref, progressTabFromLegacyCaminos } from "@/components/progress/progress-tabs";

// Ruta anterior de los Caminos: `?tab=mine` pasa a la pestaña Mis listas y
// `?tab=tracked` a Listas que sigo del panel de progreso (openspec:
// clarify-user-menu-names). El detalle `/me/caminos/[caminoId]` no cambia.
export default async function CaminosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const tab = progressTabFromLegacyCaminos((await searchParams).tab);
  redirect(`/${await getLocale()}${progressHref(tab)}`);
}
