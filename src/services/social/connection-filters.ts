// Filtros de las vistas de conexiones (openspec: redesign-connections-toolbar), sin dependencias de servidor: los usan
// el servicio, el endpoint, la página y la barra del cliente.

export const CONNECTION_SORTS = ["recent", "name"] as const;
export type ConnectionSort = (typeof CONNECTION_SORTS)[number];

export const CONNECTION_SEGMENTS = ["all", "mutual", "notBack"] as const;
export type ConnectionSegment = (typeof CONNECTION_SEGMENTS)[number];

export type ConnectionSegmentCounts = Record<ConnectionSegment, number>;

/** Recientes, salvo en los Seguidos de un perfil ajeno, que van por Nombre (D2). */
export function defaultConnectionSort(kind: "followers" | "following", isOwn: boolean): ConnectionSort {
  return kind === "following" && !isOwn ? "name" : "recent";
}

export function parseConnectionSort(value: unknown): ConnectionSort | undefined {
  return typeof value === "string" && (CONNECTION_SORTS as readonly string[]).includes(value)
    ? (value as ConnectionSort)
    : undefined;
}

export function parseConnectionSegment(value: unknown): ConnectionSegment | undefined {
  return typeof value === "string" && (CONNECTION_SEGMENTS as readonly string[]).includes(value)
    ? (value as ConnectionSegment)
    : undefined;
}
