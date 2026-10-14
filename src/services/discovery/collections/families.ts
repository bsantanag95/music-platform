// Familias de colección (openspec: unify-explore-collections, ADR 0038). Módulo puro y sin base de datos:
// lo usan la generación, la consola, las lecturas de Explorar y sus pruebas.
//
// Desde la migración 0071 la familia **vive en la fila** de `user_list_featured`, no se deriva. Este registro
// declara la familia que cada plantilla escribe al generar su colección; una colección curada recibe la que
// elige quien la destaca. Por eso ya no hay `familyOf` ni familia de respaldo: una fila retirada del registro
// conserva la familia con la que se escribió.

export const COLLECTION_FAMILIES = ["ephemeris", "awards", "releases", "discovery", "rankings"] as const;

export type CollectionFamily = (typeof COLLECTION_FAMILIES)[number];

/** Familia que declara cada plantilla del registro (`template_key`) y que la generación escribe en la fila. */
export const TEMPLATE_FAMILY: Record<string, CollectionFamily> = {
  anniversaries: "ephemeris",
  "grammy-winners": "awards",
  "new-releases": "releases",
  upcoming: "releases",
  "genre-spotlight": "discovery",
  "one-per-decade": "discovery",
  // Rankings calculados de la actividad de la gente. La familia se llamaba `community` y se renombró para no
  // confundirla con las listas que escribe la comunidad (`/lists`).
  "top-rated-quarter": "rankings",
  "most-reviewed-month": "rankings",
};

export function isCollectionFamily(value: string | undefined | null): value is CollectionFamily {
  return (COLLECTION_FAMILIES as readonly string[]).includes(value ?? "");
}
