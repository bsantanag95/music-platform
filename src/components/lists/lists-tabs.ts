// Vocabulario de pestañas de /me/lists. Módulo sin "use client" para que tanto
// la página (Server Component) como `ListsSection` (client) lo importen.

export type ListsTab = "mine" | "saved" | "discover";
export const LISTS_TABS: ListsTab[] = ["mine", "saved", "discover"];

export function parseListsTab(value: string | string[] | undefined): ListsTab {
  return LISTS_TABS.includes(value as ListsTab) ? (value as ListsTab) : "mine";
}
