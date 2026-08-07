// Query keys centralizadas — evita strings mágicos repetidos en cada
// componente que use useQuery/useMutation con TanStack Query.
export const queryKeys = {
  artistSearch: (query: string) => ["artist", "search", query] as const,
  artistById: (id: string) => ["artist", "byId", id] as const,
  releaseGroup: (id: string) => ["releaseGroup", id] as const,
  releaseGroupCover: (id: string) => ["releaseGroup", "cover", id] as const,
};
