import { listHref } from "@/lib/catalog-links";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";

/** Ruta de lectura de una lista "para completar": la del recorrido propio o la de la lista (sin dependencias de servidor). */
export function caminoHref(camino: Pick<CaminoDiscoverySummary, "kind" | "id" | "title" | "owner">): string {
  return camino.kind === "custom_journey"
    ? `/users/${camino.owner.username}/caminos/${camino.id}`
    : listHref(camino.owner.username, camino.title, camino.id);
}
