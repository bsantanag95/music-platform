// Tipos del servicio de colección física (Fase 5, cambio add-physical-collection).
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

import type { Audience } from "@/services/social/types";
import type { CollectionFormat, EditionAttribute } from "./vocabulary";

export interface CollectionEntry {
  id: string;
  format: CollectionFormat;
  attributes: EditionAttribute[];
  note: string | null;
  audience: Audience;
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

export const COLLECTION_SORTS = ["recent", "alpha", "artist", "format"] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export const COLLECTION_GROUPINGS = ["none", "format", "artist"] as const;
export type CollectionGrouping = (typeof COLLECTION_GROUPINGS)[number];

export interface CollectionFilters {
  format?: CollectionFormat;
  attribute?: EditionAttribute;
  /** Búsqueda parcial sobre el título del álbum y el nombre del artista acreditado. */
  q?: string;
  /** Orden del listado. Default `recent`. */
  sort?: CollectionSort;
  /** Clave de agrupación; solo afecta al ORDER BY. Default `none`. */
  group?: CollectionGrouping;
}

export interface CollectionCounts {
  vinyl: number;
  cd: number;
  cassette: number;
  other: number;
}

export interface NewCollectionEntry {
  releaseGroupId: string;
  format: CollectionFormat;
  attributes?: EditionAttribute[];
  note?: string | null;
  audience?: Audience;
}

export interface CollectionEntryChanges {
  format?: CollectionFormat;
  attributes?: EditionAttribute[];
  note?: string | null;
  audience?: Audience;
}

export interface CollectionPage {
  entries: CollectionEntry[];
  page: number;
  pageSize: number;
  hasNext: boolean;
  counts: CollectionCounts;
}
