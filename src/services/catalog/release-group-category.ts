import { mapReleaseGroupCategory } from "@/services/musicbrainz/mappers";
import type { ReleaseGroupCategoryValue } from "./ingest-release-group";

// Reclasificación de release-groups ya ingeridos con la regla de categoría vigente
// (openspec: redesign-song-page, D13). La usa `scripts/backfill-release-group-category.ts`.

export interface StoredCategory {
  id: string;
  mbid: string;
  title: string;
  category: string;
}

export interface FetchedTypes {
  mbid: string;
  primaryType: string | undefined;
  secondaryTypes: string[] | undefined;
}

export interface CategoryUpdate {
  id: string;
  mbid: string;
  title: string;
  from: string;
  to: ReleaseGroupCategoryValue;
}

/**
 * Cambios de categoría para los discos guardados cuyos tipos de MusicBrainz se conocen:
 * solo los que cambian con la regla vigente. Pura y determinista (orden de `stored`).
 */
export function planCategoryUpdates(stored: StoredCategory[], fetched: FetchedTypes[]): CategoryUpdate[] {
  const byMbid = new Map(fetched.map((item) => [item.mbid, item]));
  const updates: CategoryUpdate[] = [];
  for (const row of stored) {
    const types = byMbid.get(row.mbid);
    if (!types) continue;
    const to = mapReleaseGroupCategory(types.primaryType, types.secondaryTypes);
    if (to !== row.category) updates.push({ id: row.id, mbid: row.mbid, title: row.title, from: row.category, to });
  }
  return updates;
}
