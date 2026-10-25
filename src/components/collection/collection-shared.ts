import type { CollectionEntry, DiaryAudience } from "@/lib/api/schemas";
import type { CollectionEntryFormValue } from "./CollectionEntryForm";
import type { CollectionGrouping } from "@/services/collection/types";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { compatibleAttributes } from "@/services/collection/vocabulary";

export function collectionAlbumHref(entry: CollectionEntry): string {
  return albumHref(entry.album.artistName, entry.album.title, entry.album.id);
}

export function collectionArtistHref(entry: CollectionEntry): string | null {
  return entry.album.artistId
    ? artistHref(entry.album.artistName ?? "", entry.album.artistId)
    : null;
}

/** "Artista · 1987", solo el artista o solo el año, según lo que se conozca. */
export function albumByline(album: { artistName: string | null; year?: number | null }): string {
  return [album.artistName, album.year ?? null].filter((part) => part !== null && part !== "").join(" · ");
}

export function formatCollectionDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Valor inicial del formulario de edición tomado de una entrada existente. Deja
 * fuera los atributos que no aplican a su formato (dato heredado);
 * `IncompatibleAttributesNotice` avisa que se quitarán al guardar.
 */
export function entryToFormValue(entry: CollectionEntry): CollectionEntryFormValue {
  return {
    format: entry.format,
    attributes: compatibleAttributes(entry.format, entry.attributes),
    note: entry.note ?? "",
    audience: entry.audience,
  };
}

/**
 * Query de la URL con los filtros activos: reemplaza las claves indicadas y
 * conserva las demás (p. ej. `tab`). Un valor `undefined` es el defecto y no se
 * escribe. Pura, para poder probarla sin `window`.
 */
export function filtersQueryString(
  currentSearch: string,
  filters: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(currentSearch);
  for (const [key, value] of Object.entries(filters)) {
    params.delete(key);
    if (value) params.set(key, value);
  }
  return params.toString();
}

// Filtros en la URL sin crear historial: recargar o compartir abre la misma
// selección (la página los lee al cargar).
export function writeFiltersToUrl(filters: Record<string, string | undefined>) {
  const query = filtersQueryString(window.location.search, filters);
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (next === `${window.location.pathname}${window.location.search}`) return;
  window.history.replaceState(window.history.state, "", next);
}

// Acciones de gestión por fila. `null` en modo lectura (perfil ajeno).
// La edición se abre en una hoja lateral (`CollectionEditSheet`) que monta el
// orquestador; las vistas solo piden abrirla desde el menú `⋯`.
export interface CollectionRowActions {
  busyId: string | null;
  onEdit: (entry: CollectionEntry) => void;
  onAudienceChange: (entry: CollectionEntry, audience: DiaryAudience) => void;
  onRemove: (entry: CollectionEntry) => void;
  /** Entrada cuyo último intento de quitar falló: el error se muestra junto a ella. */
  errorId: string | null;
}

/** Ids de las primeras entradas, cuyas carátulas cargan con prioridad. */
export const PRIORITY_COVERS = 6;

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
  /**
   * Destino de "Ver los N" en el encabezado cuando el grupo muestra solo una
   * parte de sus copias (la previsualización del perfil). `null`/ausente: el
   * grupo está completo.
   */
  moreHref?: string | null;
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
  monthLabel: (iso: string) => string,
): CollectionGroup[] {
  if (entries.length === 0) {
    return [];
  }

  // Sin agrupar: una sola sección sin encabezado, en el orden del servidor.
  if (grouping === "none") {
    return [{ key: "all", heading: null, count: entries.length, entries }];
  }

  if (grouping === "date") {
    // Secciones contiguas por mes-año de alta, en el orden de llegada (el
    // servidor ya entrega el mes más reciente primero).
    const groups: CollectionGroup[] = [];
    for (const entry of entries) {
      const month = entry.createdAt.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.entries[0]!.createdAt.slice(0, 7) === month) {
        last.entries.push(entry);
        last.count = last.entries.length;
      } else {
        groups.push({
          key: `${month}#${groups.length}`,
          heading: monthLabel(entry.createdAt),
          count: 1,
          entries: [entry],
        });
      }
    }
    return groups;
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

  // grouping === "artist": secciones contiguas en el orden de llegada. La clave
  // lleva la posición: mientras llega la página reordenada, los datos previos
  // (en otro orden) pueden repetir un artista en dos secciones, y una clave
  // repetida deja nodos huérfanos al reconciliar.
  const groups: CollectionGroup[] = [];
  for (const entry of entries) {
    const name = entry.album.artistName ?? unknownArtistLabel;
    const last = groups[groups.length - 1];
    if (last && last.heading === name) {
      last.entries.push(entry);
      last.count = last.entries.length;
    } else {
      groups.push({ key: `${name}#${groups.length}`, heading: name, count: 1, entries: [entry] });
    }
  }
  return groups;
}
