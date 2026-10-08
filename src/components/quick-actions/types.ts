import type { ListEntityType, SocialTargetType } from "@/lib/api/schemas";

// Tipos compartidos del diálogo de acciones rápidas del Header (openspec: add-header-quick-actions).

/** Acciones del diálogo, en el orden en que se muestran como chips. */
export const QUICK_ACTIONS = ["listen", "rate", "favorite", "pending", "addToList", "newList"] as const;
export type QuickAction = (typeof QUICK_ACTIONS)[number];

/** Acciones que operan sobre un objetivo del catálogo elegido con el buscador. */
export type TargetAction = Exclude<QuickAction, "newList">;

/** Tipos que ofrece el buscador de objetivos: uno por búsqueda, álbum por defecto. */
export const PICKER_TYPES = ["album", "song", "artist"] as const;
export type PickerType = (typeof PICKER_TYPES)[number];

/**
 * Tipos de búsqueda por acción. Pendiente no admite canciones (`want_to_listen_entry` solo
 * guarda artista y álbum).
 */
export const ACTION_PICKER_TYPES: Record<TargetAction, readonly PickerType[]> = {
  listen: PICKER_TYPES,
  rate: PICKER_TYPES,
  favorite: PICKER_TYPES,
  pending: ["album", "artist"],
  addToList: PICKER_TYPES,
};

export interface PickTarget {
  type: SocialTargetType;
  id: string;
  title: string;
  subtitle: string | null;
}

/** Tipo de búsqueda que corresponde al tipo de entidad de una lista. */
export function pickerTypeForList(entityType: ListEntityType): PickerType {
  return entityType === "artist" ? "artist" : entityType === "release-group" ? "album" : "song";
}
