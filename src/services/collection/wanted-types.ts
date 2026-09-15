// Tipos de la wishlist de colección (Fase 5, cambio add-collection-wishlist).
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

import type { CollectionFormat, EditionAttribute } from "./vocabulary";

export interface WantedEntry {
  id: string;
  /** `null` = "cualquier formato" (a diferencia de CollectionEntry, sin obligatoriedad). */
  format: CollectionFormat | null;
  attributes: EditionAttribute[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
  album: {
    id: string;
    title: string;
    coverThumbUrl: string | null;
    artistId: string | null;
    artistName: string | null;
  };
}

/** Una variante deseada dentro de un alta en lote (1 a `MAX_WANTED_BATCH`). */
export interface NewWantedVariant {
  format?: CollectionFormat | null;
  attributes?: EditionAttribute[];
  note?: string | null;
}

export interface WantedEntryChanges {
  /** `null` vuelve la entrada a "cualquier formato". */
  format?: CollectionFormat | null;
  attributes?: EditionAttribute[];
  note?: string | null;
}

export const WANTED_SORTS = ["recent", "alpha"] as const;
export type WantedSort = (typeof WANTED_SORTS)[number];

export interface WantedFilters {
  /** Búsqueda parcial sobre el título del álbum y el nombre del artista acreditado. */
  q?: string;
  /** Orden del listado. Default `recent`. */
  sort?: WantedSort;
}

export interface WantedPage {
  entries: WantedEntry[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}
