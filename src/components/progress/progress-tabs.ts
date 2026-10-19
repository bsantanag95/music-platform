// Vocabulario de pestañas de /me/progress, calcado de `lists-tabs.ts`. Módulo
// sin "use client" para que tanto la página (Server Component) como
// `ProgressSection` (client) lo importen. Valores en `?tab=`:
// `discographies` (recorridos de artista), `lists` (Caminos propios) y
// `following` (listas ajenas con seguimiento de progreso).

export type ProgressTab = "discographies" | "lists" | "following";
export const PROGRESS_TABS: ProgressTab[] = ["discographies", "lists", "following"];
export const DEFAULT_PROGRESS_TAB: ProgressTab = "discographies";

// Pestaña de `?tab=` de la ruta anterior `/me/caminos` (`mine` | `tracked`).
const LEGACY_CAMINOS_TABS: Record<string, ProgressTab> = { mine: "lists", tracked: "following" };

export function parseProgressTab(value: string | string[] | undefined): ProgressTab {
  return PROGRESS_TABS.includes(value as ProgressTab) ? (value as ProgressTab) : DEFAULT_PROGRESS_TAB;
}

/** Equivalente en `/me/progress` de la pestaña de `/me/caminos` (por defecto, `lists`). */
export function progressTabFromLegacyCaminos(value: string | string[] | undefined): ProgressTab {
  return typeof value === "string" ? (LEGACY_CAMINOS_TABS[value] ?? "lists") : "lists";
}

export function progressHref(tab: ProgressTab): string {
  return `/me/progress?tab=${tab}`;
}
