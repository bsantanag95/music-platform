import type { DiscoverListSummary, ListEntityType, ListSubject, ListTheme } from "@/lib/api/schemas";
import { presentList } from "@/lib/list-presentation";
import { PLATFORM_OWNER_NAME, titleLocaleOf } from "@/services/discovery/collections/titles";

/**
 * Lo que una fila y la vista previa del lector de `/lists` necesitan de una lista (openspec: redesign-lists-phase2), venga de
 * una pestaña de listas de la comunidad o del modo explorar.
 */
export interface ReaderEntry {
  id: string;
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
  /** Última actualización (ISO). */
  updatedAt: string | null;
  description: string | null;
  saveCount: number | null;
  isOfficial: boolean;
  /** Tema y "sobre" de la lista (openspec: add-list-themes-phase1). */
  theme: ListTheme | null;
  subject: ListSubject | null;
  /** Estado de guardado para la acción Guardar; `null` si no se ofrece (sin sesión o lista propia). */
  save: { saved: boolean; following: boolean } | null;
}

export function entryFromList(list: DiscoverListSummary, locale: string, canSave: boolean): ReaderEntry {
  const shown = presentList(list, locale);
  return {
    id: list.id,
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
    isOfficial: list.isOfficial,
    theme: list.theme,
    subject: list.subject,
    save: canSave && !list.isOwn ? { saved: list.saved, following: list.following } : null,
  };
}
