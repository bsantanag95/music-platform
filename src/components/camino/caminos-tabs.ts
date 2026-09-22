// Vocabulario de pestañas de /me/caminos, calcado de `lists-tabs.ts`. Módulo
// sin "use client" para que tanto la página (Server Component) como
// `CaminosSection` (client) lo importen.

export type CaminosTab = "mine" | "tracked";
export const CAMINOS_TABS: CaminosTab[] = ["mine", "tracked"];

export function parseCaminosTab(value: string | string[] | undefined): CaminosTab {
  return CAMINOS_TABS.includes(value as CaminosTab) ? (value as CaminosTab) : "mine";
}
