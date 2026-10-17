import { sql } from "drizzle-orm";
import { db } from "@/db";
import { createTtlCache, type TtlCache } from "@/lib/ttl-cache";
import { GENRE_FAMILIES } from "@/services/genres/families";
import { isValidDecade } from "./constants";

// Géneros de una década para la vista `/explore?decada=` (openspec: redesign-explore-decades): los que tienen más discos en esa
// década, cada uno con su página a un clic. El número de discos se usa solo para ordenar y no se muestra: lo que la base ha
// guardado crece con cada artista que alguien abre y no dice nada de la época (lección de las tarjetas de familia).

/** Cuántos géneros muestra la fila. */
export const DECADE_GENRES_LIMIT = 12;

/**
 * Cuántos géneros de una misma familia puede tener la fila. Sin tope, los más grandes de una década son muchas variantes de
 * una misma familia (en la base de prueba, 5 de 12 eran de Clásica en los 1990s) y la fila no dice nada de la época.
 */
export const DECADE_GENRES_PER_FAMILY = 3;

/** Cuánto vale el resultado en memoria: la lista cambia muy despacio. */
export const DECADE_GENRES_TTL_MS = 6 * 60 * 60 * 1000;

export interface DecadeGenre {
  slug: string;
  name: string;
  nameEs: string | null;
}

export interface DecadeGenreRow extends DecadeGenre {
  /** Familia con la que el género entró (la que mejor lo posiciona); `null` si no pertenece a ninguna. */
  familyKey: string | null;
}

/**
 * Los géneros de estilo con más discos de la década (por género efectivo, con herencia), del mayor al menor y con el slug como
 * desempate, con como mucho `DECADE_GENRES_PER_FAMILY` por familia. Un género de varias familias cuenta en la que mejor lo
 * posiciona; uno sin familia cuenta aparte. Incluye el género raíz (`rock`): es justo el acceso a la ficha completa. Cada fila trae
 * la familia con la que entró, para ordenar la fila de chips por familia (`orderByFamily`).
 */
async function queryDecadeGenres(decade: number, limit: number): Promise<DecadeGenreRow[]> {
  const rows = (await db.execute(sql`
    with counted as (
      select g.id, g.slug, g.name, g.name_es as "nameEs", count(distinct e.release_group_id)::int as n
      from release_group_effective_genre e
      join genre g on g.id = e.genre_id and g.kind = 'style'
      join release_group rg on rg.id = e.release_group_id
      where rg.first_release_year between ${decade} and ${decade + 9}
      group by g.id
    ), ranked as (
      select c.*, fm.family_key, row_number() over (partition by coalesce(fm.family_key, c.slug) order by c.n desc, c.slug) as rn
      from counted c
      left join genre_family_member fm on fm.genre_id = c.id
    )
    select slug, name, "nameEs", (array_agg(family_key order by rn))[1] as "familyKey"
    from ranked
    group by id, slug, name, "nameEs", n
    having min(rn) <= ${DECADE_GENRES_PER_FAMILY}
    order by n desc, slug
    limit ${limit}
  `)) as unknown as DecadeGenreRow[];
  return rows;
}

const FAMILY_POSITION = new Map<string, number>(GENRE_FAMILIES.map((family, index) => [family.key, index]));

/**
 * Ordena los géneros por la posición de su familia en la taxonomía (Rock, Metal, Pop… Clásica al final; sin familia, al final) y,
 * dentro de cada familia, por el orden que ya traen (tamaño y slug). La selección no cambia: se corrige solo el orden, para que la
 * fila no abra con los géneros más numerosos de una familia que dice poco de la época.
 */
export function orderByFamily(rows: DecadeGenreRow[]): DecadeGenre[] {
  const position = (row: DecadeGenreRow) => (row.familyKey ? (FAMILY_POSITION.get(row.familyKey) ?? Infinity) : Infinity);
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => position(a.row) - position(b.row) || a.index - b.index)
    .map(({ row }) => ({ slug: row.slug, name: row.name, nameEs: row.nameEs }));
}

// Una caché por década: se lee la de la década que se abre, no todas.
const caches = new Map<number, TtlCache<DecadeGenre[]>>();

function cacheFor(decade: number): TtlCache<DecadeGenre[]> {
  let cache = caches.get(decade);
  if (!cache) {
    cache = createTtlCache<DecadeGenre[]>({
      ttlMs: DECADE_GENRES_TTL_MS,
      load: async () => orderByFamily(await queryDecadeGenres(decade, DECADE_GENRES_LIMIT)),
      onError: () => [],
      errorLabel: `No se pudieron leer los géneros de la década ${decade}`,
    });
    caches.set(decade, cache);
  }
  return cache;
}

/**
 * Hasta `DECADE_GENRES_LIMIT` géneros de la década, con caché en memoria. Una década inválida devuelve `[]` sin consultar. Un
 * error devuelve `[]` (la vista no pinta la fila) y no se cachea.
 */
export async function listDecadeGenres(decade: number, now: number = Date.now()): Promise<DecadeGenre[]> {
  if (!isValidDecade(decade)) return [];
  return cacheFor(decade).get(now);
}

/** Solo para pruebas: vacía las cachés. */
export function resetDecadeGenresCache(): void {
  caches.clear();
}
