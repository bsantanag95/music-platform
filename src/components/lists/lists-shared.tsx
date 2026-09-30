import type { ReactNode } from "react";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";

const COLS_CLASS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
} as const;

// Grilla de tarjetas de lista: una columna en mobile, más desde `sm`/`lg` según
// `cols`. Por defecto dos columnas (usado por las tres pestañas de /me/lists y
// por el perfil ajeno); las secciones de navegación de `/lists` piden 1 o 3
// para variar la densidad según qué tan detenida deba ser la lectura.
export function ListsGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={`grid gap-4 ${COLS_CLASS[cols]}`}>{children}</div>;
}

const ENTITY_KEY: Record<string, "entityTypeArtist" | "entityTypeAlbum" | "entityTypeSong"> = {
  artist: "entityTypeArtist",
  "release-group": "entityTypeAlbum",
  recording: "entityTypeSong",
};

export function entityTypeKey(entityType: string) {
  return ENTITY_KEY[entityType] ?? "entityTypeArtist";
}

// Ruta de catálogo del objetivo de un ítem de lista, según el tipo de la lista.
// `meta` lleva el nombre/título para el slug decorativo; sin él la ruta sigue
// siendo válida (solo el id), así que no es obligatorio.
interface ListItemHrefMeta {
  name?: string;
  title?: string;
  artistName?: string | null;
}

export function listItemHref(
  targetId: string,
  entityType: string,
  meta?: ListItemHrefMeta,
): string {
  if (entityType === "artist") return artistHref(meta?.name ?? meta?.title ?? "", targetId);
  if (entityType === "release-group") {
    return albumHref(meta?.artistName ?? null, meta?.title ?? "", targetId);
  }
  return songHref(meta?.artistName ?? null, meta?.title ?? "", targetId);
}

// Página dedicada de "Mostrar en listas" de un ítem puntual (openspec:
// show-item-in-lists) — a la que enlaza el "Ver más" del panel acotado a 4
// resultados. Mismo mapeo de tipo a ruta que `listItemHref`, con el
// sub-segmento fijo `/lists`.
export function itemListsHref(target: {
  type: string;
  id: string;
  name?: string;
  title?: string;
  artistName?: string | null;
}): string {
  return `${listItemHref(target.id, target.type, target)}/lists`;
}
