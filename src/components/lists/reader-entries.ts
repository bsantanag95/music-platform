import type { CaminoDiscoverySummary } from "@/services/camino/discovery";
import type { DiscoverListSummary, ListEntityType } from "@/lib/api/schemas";
import { presentList } from "@/lib/list-presentation";
import { PLATFORM_OWNER_NAME, titleLocaleOf } from "@/services/discovery/collections/titles";
import { caminoHref } from "@/components/camino/camino-href";

/**
 * Lo que una fila y la vista previa del lector de `/lists` necesitan de una lista (openspec: redesign-lists-phase2), venga de
 * una pestaña de listas de la comunidad o de "Para completar". Un solo modelo para que la fila y la vista previa no
 * distingan de dónde salió.
 */
export interface ReaderEntry {
  id: string;
  kind: "list" | "camino";
  title: string;
  /** A dónde lleva la fila (y "Abrir la lista" en la vista previa). */
  href: string;
  /** `username` del dueño: con él se piden los elementos para la vista previa. */
  ownerUsername: string;
  ownerName: string;
  /** Perfil del dueño; `null` en una colección generada (es de la plataforma). */
  ownerHref: string | null;
  coverThumbs: string[];
  itemCount: number;
  entityType: ListEntityType;
  /** Última actualización (ISO); `null` en "Para completar", que no la trae. */
  updatedAt: string | null;
  description: string | null;
  saveCount: number | null;
  /** Personas que la están completando ("Para completar"). */
  trackingCount: number | null;
  isOfficial: boolean;
  /** Si la vista previa puede pedir sus elementos (`GET /api/users/{username}/lists/{listId}`). */
  previewable: boolean;
  /** Estado de guardado para la acción Guardar; `null` si no se ofrece (sin sesión, lista propia o "Para completar"). */
  save: { saved: boolean; following: boolean } | null;
}

export function entryFromList(list: DiscoverListSummary, locale: string, canSave: boolean): ReaderEntry {
  const shown = presentList(list, locale);
  return {
    id: list.id,
    kind: "list",
    title: shown.title,
    href: shown.href,
    ownerUsername: list.owner.username,
    ownerName: list.generated
      ? PLATFORM_OWNER_NAME[titleLocaleOf(locale)]
      : (list.owner.displayName ?? `@${list.owner.username}`),
    ownerHref: list.generated ? null : `/users/${encodeURIComponent(list.owner.username)}`,
    coverThumbs: list.coverThumbs,
    itemCount: list.itemCount,
    entityType: list.entityType,
    updatedAt: list.updatedAt,
    description: list.description,
    saveCount: typeof list.saveCount === "number" ? list.saveCount : null,
    trackingCount: null,
    isOfficial: list.isOfficial,
    previewable: true,
    save: canSave && !list.isOwn ? { saved: list.saved, following: list.following } : null,
  };
}

export function entryFromCamino(camino: CaminoDiscoverySummary): ReaderEntry {
  return {
    id: camino.id,
    kind: "camino",
    title: camino.title,
    href: caminoHref(camino),
    ownerUsername: camino.owner.username,
    ownerName: camino.owner.displayName ?? `@${camino.owner.username}`,
    ownerHref: `/users/${encodeURIComponent(camino.owner.username)}`,
    coverThumbs: camino.coverThumbs,
    itemCount: camino.itemCount,
    entityType: "release-group",
    updatedAt: null,
    description: null,
    saveCount: null,
    trackingCount: camino.trackingCount,
    isOfficial: false,
    // Un recorrido propio (`custom_journey`) no es una lista: su vista previa queda sin elementos.
    previewable: camino.kind === "standard",
    save: null,
  };
}
