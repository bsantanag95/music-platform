import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyCaminos } from "@/services/camino/camino";
import { listTrackedLists } from "@/services/lists/saved-lists";
import { CaminosSection } from "@/components/camino/CaminosSection";
import { parseCaminosTab } from "@/components/camino/caminos-tabs";
import { MyCaminosList } from "@/components/camino/MyCaminosList";
import { TrackedCaminosList } from "@/components/camino/TrackedCaminosList";

// Punto de entrada desde el menú de usuario (`user-menu-items.ts`, id
// `caminos`). Dos pestañas — "Mis Caminos" y "Trackeados" — mismo patrón que
// `/me/lists` ("Mis listas · Guardadas · Descubrir"), elegido tras comparar
// mockups: una lista unificada mezclaba dos semánticas de "Estado" y de
// acción por fila distintas (ver openspec: add-camino, Requirement "Estante
// 'Caminos'..." y design.md).
export default async function CaminosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const t = await getTranslations("camino");
  const user = await requirePageUser();
  const tab = parseCaminosTab((await searchParams).tab);

  const panel =
    tab === "tracked" ? (
      <TrackedCaminosList lists={await listTrackedLists(user.id)} />
    ) : (
      <MyCaminosList caminos={await listMyCaminos(user.id)} />
    );

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("pageTitle")}</h1>
      <CaminosSection activeTab={tab}>{panel}</CaminosSection>
    </main>
  );
}
