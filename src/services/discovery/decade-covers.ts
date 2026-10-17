import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createTtlCache } from "@/lib/ttl-cache";
import { albumSignalOrder } from "./collections/signal";

// Carátulas de las tarjetas de década de `/explore` (openspec: redesign-explore-decades). Cada tarjeta es un mosaico de hasta
// `COVERS_PER_DECADE` carátulas de discos de estudio de la década, elegidos por la misma señal de calidad que ordena las
// colecciones del día 0 (valoración de la comunidad, premio y calendario) con desempate por id, de modo que son estables entre
// visitas. A diferencia de las familias de géneros, las décadas son disjuntas (un disco tiene un solo año): no hace falta
// repartir discos entre tarjetas.

export const COVERS_PER_DECADE = 4;

/** Cuánto vale el resultado en memoria: cambia solo cuando entran discos nuevos o cambia la señal. */
export const DECADE_COVERS_TTL_MS = 6 * 60 * 60 * 1000;

/** Carátulas por década (año de inicio: 1990, 2000, …). Una década sin discos de estudio con carátula no tiene entrada. */
export type DecadeCovers = Map<number, string[]>;

/**
 * Una sola consulta con ventana, no una por década. `albumSignalOrder` se correlaciona con `"release_group"."id"`, de ahí que la
 * consulta interior sea sobre `release_group` sin alias.
 */
async function queryDecadeCovers(): Promise<DecadeCovers> {
  const rows = (await db.execute(sql`
    select ranked.decade as "decade", ranked.cover as "cover"
    from (
      select
        (floor("release_group"."first_release_year" / 10) * 10)::int as decade,
        "release_group"."cover_thumb_url" as cover,
        row_number() over (
          partition by floor("release_group"."first_release_year" / 10)
          order by ${sql.join(albumSignalOrder(), sql`, `)}
        ) as rn
      from "release_group"
      where "release_group"."category" = 'studio'
        and "release_group"."cover_thumb_url" is not null
        and "release_group"."first_release_year" is not null
    ) ranked
    where ranked.rn <= ${COVERS_PER_DECADE}
    order by ranked.decade, ranked.rn
  `)) as unknown as { decade: number | string; cover: string }[];
  const covers: DecadeCovers = new Map();
  for (const row of rows) {
    const decade = Number(row.decade);
    covers.set(decade, [...(covers.get(decade) ?? []), row.cover]);
  }
  return covers;
}

const cache = createTtlCache<DecadeCovers>({
  ttlMs: DECADE_COVERS_TTL_MS,
  load: queryDecadeCovers,
  onError: () => new Map<number, string[]>(),
  errorLabel: "No se pudieron leer las carátulas de las décadas",
});

/**
 * Carátulas por década, con caché en memoria (`DECADE_COVERS_TTL_MS`): `/explore` no puede pagar la consulta en cada visita. Las
 * visitas simultáneas comparten una sola consulta. Un error no se cachea: devuelve el mapa vacío (la portada pinta tarjetas planas)
 * y se reintenta en la próxima visita.
 */
export function listDecadeCovers(now: number = Date.now()): Promise<DecadeCovers> {
  return cache.get(now);
}

/** Solo para pruebas: vacía la caché. */
export function resetDecadeCoversCache(): void {
  cache.reset();
}
