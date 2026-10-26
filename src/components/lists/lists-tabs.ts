// Vocabulario de pestañas de /me/lists. Módulo sin "use client" para que tanto
// la página (Server Component) como `ListsSection` (client) lo importen.
// Descubrir dejó de ser una pestaña: vive en `/lists` (openspec: redesign-me-lists-toolbar, D5).

export type ListsTab = "mine" | "saved";
export const LISTS_TABS: ListsTab[] = ["mine", "saved"];

export function parseListsTab(value: string | string[] | undefined): ListsTab {
  return LISTS_TABS.includes(value as ListsTab) ? (value as ListsTab) : "mine";
}
