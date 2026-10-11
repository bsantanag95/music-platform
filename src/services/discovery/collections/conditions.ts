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
