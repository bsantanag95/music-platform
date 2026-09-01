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

export interface CollectionFilters {
  format?: CollectionFormat;
  attribute?: EditionAttribute;
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
}
