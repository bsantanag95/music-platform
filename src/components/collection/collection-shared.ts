import type { CollectionEntry, DiaryAudience } from "@/lib/api/schemas";
import type { CollectionEntryFormValue } from "./CollectionEntryForm";
import type { CollectionGrouping } from "@/services/collection/types";

export function collectionAlbumHref(entry: CollectionEntry): string {
  return `/album/${entry.album.id}`;
}

export function collectionArtistHref(entry: CollectionEntry): string | null {
  return entry.album.artistId ? `/artist/${entry.album.artistId}` : null;
}

export function formatCollectionDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Valor inicial del formulario de edición tomado de una entrada existente. */
export function entryToFormValue(entry: CollectionEntry): CollectionEntryFormValue {
  return {
    format: entry.format,
    attributes: [...entry.attributes],
    note: entry.note ?? "",
    audience: entry.audience,
  };
}

// Acciones de gestión por fila. `null` en modo lectura (perfil ajeno).
export interface CollectionRowActions {
  busyId: string | null;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (entry: CollectionEntry, value: CollectionEntryFormValue) => void;
  onAudienceChange: (entry: CollectionEntry, audience: DiaryAudience) => void;
  onRemove: (entry: CollectionEntry) => void;
}

export interface CollectionSelectionState {
  active: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export interface CollectionGroup {
  key: string;
  /** Título de sección; `null` cuando no hay agrupación. */
  heading: string | null;
  /** Conteo mostrado junto al título; `null` si no se conoce con exactitud. */
  count: number | null;
  entries: CollectionEntry[];
}

const FORMAT_ORDER = ["vinyl", "cd", "cassette", "other"] as const;

/**
 * Parte la lista plana —que ya llega ordenada por el servidor según la clave de
 * grupo— en secciones. El conteo de cada sección es el de las entradas visibles
 * (ver design.md, decisión 3); el conteo total por formato vive en el
 * encabezado-retrato, que usa `counts` del servidor.
 */
export function groupEntries(
  entries: CollectionEntry[],
  grouping: CollectionGrouping,
  formatLabel: (format: string) => string,
  unknownArtistLabel: string,
): CollectionGroup[] {
  if (grouping === "none" || entries.length === 0) {
    return [{ key: "all", heading: null, count: null, entries }];
  }

  if (grouping === "format") {
    return FORMAT_ORDER.map((format) => {
      const groupEntries = entries.filter((entry) => entry.format === format);
      return {
        key: format,
        heading: formatLabel(format),
        count: groupEntries.length,
        entries: groupEntries,
      };
    }).filter((group) => group.entries.length > 0);
  }

  // grouping === "artist": secciones contiguas en el orden de llegada.
  const groups: CollectionGroup[] = [];
  for (const entry of entries) {
    const name = entry.album.artistName ?? unknownArtistLabel;
    const last = groups[groups.length - 1];
    if (last && last.key === name) {
      last.entries.push(entry);
      last.count = last.entries.length;
    } else {
      groups.push({ key: name, heading: name, count: 1, entries: [entry] });
    }
  }
  return groups;
}
