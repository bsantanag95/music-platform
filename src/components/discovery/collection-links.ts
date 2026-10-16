import { collectionHref, listHref } from "@/lib/catalog-links";
import { collectionTitle } from "@/services/discovery/collections/titles";
import type { FeaturedCollection } from "@/services/discovery/discovery";

// Título y enlace de una colección destacada, compartidos por el riel y la destacada de la página de colecciones. Las
// generadas se muestran con el título del idioma y viven en su propia ruta bajo Explorar; las curadas son listas de la
// cuenta curadora y conservan su título y su ruta de lista (ADR 0037).

export function collectionTitleOf(collection: FeaturedCollection, locale: string): string {
  return collection.source === "template"
    ? collectionTitle(collection.templateKey, collection.periodKey, locale, collection.title)
    : collection.title;
}

export function collectionLinkOf(collection: FeaturedCollection, locale: string, curatorUsername: string): string {
  return collection.source === "template"
    ? collectionHref(collectionTitleOf(collection, locale), collection.id)
    : listHref(curatorUsername, collection.title, collection.id);
}
