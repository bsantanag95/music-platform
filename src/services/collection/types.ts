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

export const COLLECTION_GROUPINGS = ["artist", "format", "date"] as const;
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

// Cuánto del estante "Colección" se muestra en el Nivel 2 del perfil antes de la
// puerta a `/users/[username]/collection`: los primeros artistas (los de los que
// más copias tiene) y, de cada uno, sus copias más recientes. 4 por artista es
// una fila completa de la grilla de 4 columnas de la Estantería.
export const COLLECTION_PREVIEW_ARTISTS = 5;
export const COLLECTION_PREVIEW_PER_ARTIST = 4;

export interface CollectionPreviewArtist {
  /** Artista principal acreditado; `null` para copias de álbumes sin artista. */
  name: string | null;
  /** Total real de copias visibles de este artista (no las que se traen). */
  total: number;
  /** Las copias más recientes de este artista, hasta `COLLECTION_PREVIEW_PER_ARTIST`. */
  entries: CollectionEntry[];
}

export interface CollectionPreview {
  artists: CollectionPreviewArtist[];
  /** Total real de copias visibles del perfil. */
  totalEntries: number;
  /** Total real de artistas distintos con copias visibles. */
  totalArtists: number;
}

