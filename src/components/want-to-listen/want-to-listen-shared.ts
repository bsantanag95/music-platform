import type { WantToListenEntry, WantToListenTargetType } from "@/lib/api/schemas";

// Orden fijo de secciones: artistas → álbumes.
export const WANT_TO_LISTEN_TYPE_ORDER: WantToListenTargetType[] = ["artist", "release-group"];

export function wantToListenHref(entry: WantToListenEntry): string {
  return entry.targetType === "artist" ? `/artist/${entry.target.id}` : `/album/${entry.target.id}`;
}

export function sectionTitleKey(type: WantToListenTargetType): "sectionArtists" | "sectionAlbums" {
  return type === "artist" ? "sectionArtists" : "sectionAlbums";
}

export interface WantToListenGroup {
  type: WantToListenTargetType;
  entries: WantToListenEntry[];
}

// Parte la lista plana (cronológica) en dos secciones no vacías, en el orden
// fijo artista → álbum — mismo criterio que `groupFavoritesByType`.
export function groupWantToListenByType(entries: WantToListenEntry[]): WantToListenGroup[] {
  return WANT_TO_LISTEN_TYPE_ORDER.map((type) => ({
    type,
    entries: entries.filter((entry) => entry.targetType === type),
  })).filter((group) => group.entries.length > 0);
}
