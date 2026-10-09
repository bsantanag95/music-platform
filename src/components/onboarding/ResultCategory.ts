import type { ReleaseGroupCategory } from "@/lib/api/schemas";

/** Categorías que el listado de resultados nombra: las de estudio son el caso normal y no se rotulan. */
export function categoryKey(category: ReleaseGroupCategory | null): "single_ep" | "compilation" | "live_other" | null {
  return category === "single_ep" || category === "compilation" || category === "live_other" ? category : null;
}
