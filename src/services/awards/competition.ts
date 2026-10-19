import { sql } from "drizzle-orm";

// Nominaciones de premios competitivos, como subconsulta reutilizable (openspec: add-grammy-hall-of-fame, design D4, ADR 0044).
// Una incorporación a un salón de la fama no es un premio ganado: los puntajes que ordenan el catálogo ("Destacados" y la
// popularidad) leen de aquí y no de `award_nomination` directo, así una clase de un salón no altera su orden. No está
// correlacionada con nada, como pide el comentario de `awardScore` en `discovery.ts`: Postgres la evalúa una vez.
//
// Solo expone las columnas que esos puntajes necesitan; si otro lector necesita más, que las agregue aquí en vez de
// volver a escribir el filtro por tipo.
export const competitionNominations = sql`(
  select n.id, n.won, n.release_group_id, n.anchor_release_group_id
  from award_nomination n
  join award_category_edition e on e.id = n.category_edition_id
  join award_ceremony c on c.id = e.ceremony_id
  join award a on a.id = c.award_id
  where a.kind = 'competition'
)`;
