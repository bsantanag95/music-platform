import { sql, type SQL } from "drizzle-orm";

/**
 * La lista (`"user_list"`) no es una colección generada por plantilla (openspec:
 * automate-explore-collections). Las generadas no se gestionan en la consola editorial ni son
 * actividad de feed. SQL crudo con el nombre de tabla literal: correlaciona con la consulta externa.
 */
export function notGeneratedCollectionCondition(): SQL {
  return sql`not exists (
    select 1 from user_list_featured ulf
    where ulf.list_id = "user_list"."id" and ulf.source = 'template'
  )`;
}

/**
 * La lista (`"user_list"`) no es una colección de Explorar, ni generada ni curada: no tiene fila en
 * `user_list_featured` (ADR 0038). Una colección es contenido de la plataforma y se recorre en
 * `/explore/collections`, no entre las listas de la comunidad (`/lists` → Destacadas). A diferencia de
 * `notGeneratedCollectionCondition`, deja fuera también las curadas a mano: siguen siendo listas oficiales de la
 * cuenta curadora, pero al destacarlas pasan a ser colecciones. SQL crudo con el nombre de tabla literal.
 */
export function notFeaturedCollectionCondition(): SQL {
  return sql`not exists (
    select 1 from user_list_featured ulf
    where ulf.list_id = "user_list"."id"
  )`;
}
