// Familias de colección (openspec: split-explore-collections, ADR 0036). Módulo puro y sin base de datos:
// lo usan las lecturas de Explorar, la página de colecciones y sus pruebas. La familia vive en código, no en
// la fila: una plantilla retirada del registro no pierde su archivo (cae a `discovery`).

export const COLLECTION_FAMILIES = ["ephemeris", "awards", "releases", "discovery", "community"] as const;

export type CollectionFamily = (typeof COLLECTION_FAMILIES)[number];

/** Familia de cada plantilla del registro (`template_key`). */
export const TEMPLATE_FAMILY: Record<string, CollectionFamily> = {
  anniversaries: "ephemeris",
  "grammy-winners": "awards",
  "new-releases": "releases",
  upcoming: "releases",
  "genre-spotlight": "discovery",
  "one-per-decade": "discovery",
  "top-rated-quarter": "community",
  "most-reviewed-month": "community",
};

/** Familia de respaldo para una clave que ya no está en el registro. */
export const FALLBACK_FAMILY: CollectionFamily = "discovery";

export function familyOf(templateKey: string | null): CollectionFamily {
  return (templateKey ? TEMPLATE_FAMILY[templateKey] : undefined) ?? FALLBACK_FAMILY;
}

export function isCollectionFamily(value: string | undefined | null): value is CollectionFamily {
  return (COLLECTION_FAMILIES as readonly string[]).includes(value ?? "");
}

/** Claves de plantilla declaradas para una familia. */
export function templateKeysOf(family: CollectionFamily): string[] {
  return Object.entries(TEMPLATE_FAMILY)
    .filter(([, value]) => value === family)
    .map(([key]) => key);
}
