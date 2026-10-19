// Señal de calidad para ordenar y desempatar álbumes cuando la comunidad aún no opina (openspec:
// add-day-zero-collections, ADR 0035). Fragmentos SQL correlacionados con `"release_group"."id"`
// (la consulta exterior debe ser sobre `release_group` sin alias); no materializan nada.
//
// Orden, del más al menos fuerte:
//   1. promedio de valoraciones, solo con `MIN_RATINGS_PER_ALBUM` o más;
//   2. premio: ganador (2) antes que nominado (1), directo o como disco ancla de una grabación;
//   3. rango de popularidad del calendario (`anonymous_rank`, menor = mejor);
//   4. carátula ya resuelta;
//   5. (desempates propios de la plantilla) y, al final, el id, para que sea determinista.

import { asc, sql, type SQL } from "drizzle-orm";
import { releaseGroup } from "@/db/schema";
import { NEGATIVE_RETRY_MS } from "@/lib/config/cover-mirror";
import { competitionNominations } from "@/services/awards/competition";
import { MIN_RATINGS_PER_ALBUM } from "../constants";

const RG = sql`"release_group"."id"`;

/** Promedio de estrellas del disco si alcanza el umbral de valoraciones; si no, `null`. */
const communityScore = sql`(
  select avg(r.stars)::float from rating r
  where r.release_group_id = ${RG}
  having count(*) >= ${MIN_RATINGS_PER_ALBUM}
)`;

/** 2 si ganó un premio, 1 si fue nominado, `null` si no tiene. Solo premios competitivos: un salón de la fama no cuenta (ADR 0044). */
const awardScore = sql`(
  select max(case when n.won then 2 else 1 end) from ${competitionNominations} n
  where n.release_group_id = ${RG} or n.anchor_release_group_id = ${RG}
)`;

/** Mejor (menor) rango de popularidad del calendario, o `null`. */
const calendarRank = sql`(
  select min(c.anonymous_rank) from release_calendar_entry c where c.release_group_id = ${RG}
)`;

/**
 * Expresiones de `ORDER BY` de la señal. `tiebreakers` van antes del id final (p. ej. la fecha, para que
 * "Novedades" desempate por el más reciente).
 */
export function albumSignalOrder(...tiebreakers: SQL[]): SQL[] {
  return [
    sql`${communityScore} desc nulls last`,
    sql`${awardScore} desc nulls last`,
    sql`${calendarRank} asc nulls last`,
    sql`(${releaseGroup.coverThumbUrl} is not null) desc`,
    ...tiebreakers,
    asc(releaseGroup.id),
  ];
}

/**
 * El disco tiene carátula o se puede intentar resolverla: descarta las retiradas y las ausencias
 * confirmadas hace poco (la ventana de negativos), que no valen una petición.
 */
export function coverResolvableCondition(): SQL {
  const retryDays = Math.round(NEGATIVE_RETRY_MS / (24 * 60 * 60 * 1000));
  return sql`(
    ${releaseGroup.coverThumbUrl} is not null
    or (
      ${releaseGroup.coverBlockedAt} is null
      and (${releaseGroup.coverCheckedAt} is null
           or ${releaseGroup.coverCheckedAt} < now() - make_interval(days => ${retryDays}))
    )
  )`;
}
