import type { DiaryFiltersParams, FeedFiltersParams } from "@/lib/api/diary";
import type { ListFiltersParams } from "@/lib/api/lists";

// Query keys centralizadas — evita strings mágicos repetidos en cada
// componente que use useQuery/useMutation con TanStack Query.
export const queryKeys = {
  artistSearch: (query: string) => ["artist", "search", query] as const,
  artistById: (id: string) => ["artist", "byId", id] as const,
  releaseGroup: (id: string) => ["releaseGroup", id] as const,
  releaseGroupCover: (id: string) => ["releaseGroup", "cover", id] as const,
  homeFeedPreview: () => ["home", "feedPreview"] as const,
  homeRecentActivity: () => ["home", "recentActivity"] as const,
  // Los filtros forman parte de la key a propósito: cada combinación es una serie de
  // páginas independiente para TanStack Query, así que cambiar cualquier filtro
  // dispara una recarga limpia desde la página 1 en vez de mutar estado a mano.
  myDiary: (filters: DiaryFiltersParams) => ["diary", "mine", filters] as const,
  myFeed: (filters: FeedFiltersParams) => ["feed", "mine", filters] as const,
  myLists: (filters: ListFiltersParams) => ["lists", "mine", filters] as const,
  savedLists: () => ["lists", "saved"] as const,
  discoverLists: () => ["lists", "discover"] as const,
};
