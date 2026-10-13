import { collectionHref, listHref } from "@/lib/catalog-links";
import { collectionTitle, type GeneratedRef } from "@/services/discovery/collections/titles";

interface PresentableList {
  id: string;
  title: string;
  owner: { username: string };
  /** Plantilla y período si la lista es una colección generada; `null`/ausente en las demás. */
  generated?: GeneratedRef | null;
}

/**
 * Título y enlace con que se muestra una lista en un listado (guardadas, en seguimiento…). Una colección generada
 * se muestra con el título del idioma y enlaza a su ruta bajo Explorar; cualquier otra lista conserva su título y
 * su ruta de usuario (openspec: localize-collection-titles).
 */
export function presentList(list: PresentableList, locale: string): { title: string; href: string } {
  if (list.generated) {
    const title = collectionTitle(list.generated.templateKey, list.generated.periodKey, locale, list.title);
    return { title, href: collectionHref(title, list.id) };
  }
  return { title: list.title, href: listHref(list.owner.username, list.title, list.id) };
}
