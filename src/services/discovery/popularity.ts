import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { createTtlCache } from "@/lib/ttl-cache";
import { POPULARITY_FIGURE_MIN, RAIL_SIZE, type PopularWindow } from "./constants";

export { POPULARITY_FIGURE_MIN, type PopularWindow };

// Popularidad de la comunidad (openspec: explore-popular-now, ADR 0041). Suma **personas distintas**, no acciones: cada persona
// aporta, por objetivo, la suma de los pesos de los tipos de gesto distintos que hizo sobre él, con un tope. Las estrellas de una
// valoración no cuentan por su nota (eso es "Mejor valorados"). Respeta lo marcado como privado y solo cuenta cuentas activas.
// Las tablas de gestos crecen con la actividad, no con el catálogo: se calcula en consulta, sin tabla materializada.

/** Peso de cada tipo de gesto (regla de negocio, `docs/01-domain/business-rules.md`). */
export const POPULARITY_WEIGHTS = {
  favorite: 3,
  review: 2,
  follow: 2,
  listen: 1,
  rating: 1,
  list: 1,
  collection: 1,
  wantToListen: 0.5,
  wanted: 0.5,
} as const;

export type GestureType = keyof typeof POPULARITY_WEIGHTS;

/** Lo máximo que una persona aporta a un objetivo, sume los gestos que sume. */
export const POPULARITY_PERSON_CAP = 4;


/** Cuánto vale en memoria el resultado de "Popular ahora": la actividad nueva aparece pronto. */
export const POPULAR_NOW_TTL_MS = 15 * 60 * 1000;

export type PopularKind = "album" | "artist" | "song";

/** Mínimo de objetivos para mostrar un tipo, y cuántos se muestran. */
export const POPULAR_MIN: Record<PopularKind, number> = { album: 6, artist: 5, song: 5 };
export const POPULAR_LIMIT: Record<PopularKind, number> = { album: RAIL_SIZE, artist: 10, song: 10 };

/** Escalones de la ventana: se usa el primero que llega al mínimo; el último acepta objetivos con una sola persona. */
export const POPULAR_WINDOWS: { window: PopularWindow; days: number | null; minPeople: number }[] = [
  { window: "month", days: 30, minPeople: 2 },
  { window: "quarter", days: 90, minPeople: 2 },
  { window: "all", days: null, minPeople: 1 },
];

export interface PopularScore {
  id: string;
  score: number;
  /** Personas distintas: solo se muestra desde `POPULARITY_FIGURE_MIN`. */
  people: number;
}

export interface PopularResult {
  window: PopularWindow;
  items: PopularScore[];
}

const W = POPULARITY_WEIGHTS;

/**
 * Tipo y peso como literales (son constantes de este módulo, no entrada de nadie): como parámetros, Postgres no puede inferir su
 * tipo dentro de un `union all`.
 */
const literals = (type: GestureType) => sql.raw(`'${type}'::text as gesture, ${W[type]}::float as weight`);

/** Una fila de gesto: `user_id`, `target_id`, `gesture`, `weight`, `at`. */
const gesture = (type: GestureType, from: SQL, target: SQL, at: SQL, where: SQL) =>
  sql`select x.user_id, ${target} as target_id, ${literals(type)}, ${at} as at from ${from} x where ${where}`;

/**
 * Gestos sobre álbumes. Lo privado no cuenta (`audience = 'private'` en favoritos, diario, colección, búsqueda y listas) ni las
 * reseñas ocultas. Las valoraciones fechan por su última modificación: cambiar la nota es actividad.
 */
function albumGestures(): SQL {
  return sql.join(
    [
      gesture("favorite", sql`favorite`, sql`x.release_group_id`, sql`x.created_at`, sql`x.release_group_id is not null and x.audience <> 'private'`),
      gesture("review", sql`review`, sql`x.release_group_id`, sql`x.created_at`, sql`x.release_group_id is not null and x.moderation_status = 'visible'`),
      gesture("listen", sql`listen_entry`, sql`x.release_group_id`, sql`x.created_at`, sql`x.release_group_id is not null and x.audience <> 'private'`),
      gesture("rating", sql`rating`, sql`x.release_group_id`, sql`x.updated_at`, sql`x.release_group_id is not null`),
      gesture("collection", sql`collection_entry`, sql`x.release_group_id`, sql`x.created_at`, sql`x.audience <> 'private'`),
      gesture("wantToListen", sql`want_to_listen_entry`, sql`x.release_group_id`, sql`x.created_at`, sql`x.release_group_id is not null`),
      gesture("wanted", sql`wanted_entry`, sql`x.release_group_id`, sql`x.created_at`, sql`x.audience <> 'private'`),
      listGesture(sql`release_group_id`),
    ],
    sql` union all `,
  );
}

/** Añadir a una lista no privada: quien cuenta es la dueña de la lista. */
function listGesture(column: SQL): SQL {
  return sql`select l.owner_id as user_id, i.${column} as target_id, ${literals("list")}, i.created_at as at
    from user_list_item i join user_list l on l.id = i.list_id
    where i.${column} is not null and l.audience <> 'private'`;
}

/** Gestos sobre canciones. */
function songGestures(): SQL {
  return sql.join(
    [
      gesture("favorite", sql`favorite`, sql`x.recording_id`, sql`x.created_at`, sql`x.recording_id is not null and x.audience <> 'private'`),
      gesture("review", sql`review`, sql`x.recording_id`, sql`x.created_at`, sql`x.recording_id is not null and x.moderation_status = 'visible'`),
      gesture("listen", sql`listen_entry`, sql`x.recording_id`, sql`x.created_at`, sql`x.recording_id is not null and x.audience <> 'private'`),
      gesture("rating", sql`rating`, sql`x.recording_id`, sql`x.updated_at`, sql`x.recording_id is not null`),
      listGesture(sql`recording_id`),
    ],
    sql` union all `,
  );
}

/**
 * Gestos sobre artistas: los directos y los de sus álbumes, atribuidos al artista principal del álbum (el primer crédito). Un
 * favorito al artista y otro a su disco son el mismo tipo de gesto para esa persona: cuentan una vez.
 */
function artistGestures(): SQL {
  const direct = sql.join(
    [
      gesture("follow", sql`artist_follow`, sql`x.artist_id`, sql`x.created_at`, sql`true`),
      gesture("favorite", sql`favorite`, sql`x.artist_id`, sql`x.created_at`, sql`x.artist_id is not null and x.audience <> 'private'`),
      gesture("review", sql`review`, sql`x.artist_id`, sql`x.created_at`, sql`x.artist_id is not null and x.moderation_status = 'visible'`),
      gesture("listen", sql`listen_entry`, sql`x.artist_id`, sql`x.created_at`, sql`x.artist_id is not null and x.audience <> 'private'`),
      gesture("rating", sql`rating`, sql`x.artist_id`, sql`x.updated_at`, sql`x.artist_id is not null`),
      gesture("wantToListen", sql`want_to_listen_entry`, sql`x.artist_id`, sql`x.created_at`, sql`x.artist_id is not null`),
      listGesture(sql`artist_id`),
    ],
    sql` union all `,
  );
  const viaAlbums = sql`select a.user_id, pc.artist_id as target_id, a.gesture, a.weight, a.at
    from (${albumGestures()}) a
    join (
      select distinct on (c.release_group_id) c.release_group_id, c.artist_id
      from credit c where c.release_group_id is not null
      order by c.release_group_id, c.position
    ) pc on pc.release_group_id = a.target_id`;
  return sql`${direct} union all ${viaAlbums}`;
}

export function gesturesOf(kind: PopularKind): SQL {
  return kind === "album" ? albumGestures() : kind === "song" ? songGestures() : artistGestures();
}

/**
 * Puntuación por objetivo: un gesto por (persona, objetivo, tipo) —el más reciente—, la suma por persona con tope y la suma por
 * objetivo, con el número de personas y la actividad más reciente. Solo cuentas activas. `since` (ISO) acota los gestos a la ventana.
 */
export function popularityScoreQuery(
  kind: PopularKind,
  options: { since?: string; until?: string; ids?: string[]; minPeople: number; limit?: number },
): SQL {
  const since = options.since ? sql`and g.at >= ${options.since}::timestamptz` : sql``;
  const until = options.until ? sql`and g.at < ${options.until}::timestamptz` : sql``;
  const only =
    options.ids !== undefined
      ? sql`and g.target_id = any(array[${sql.join(options.ids.map((id) => sql`${id}`), sql`, `)}]::uuid[])`
      : sql``;
  const window = sql`${since} ${until} ${only}`;
  const limit = options.limit !== undefined ? sql`limit ${options.limit}` : sql``;
  return sql`
    select p.target_id as "id", sum(p.person_score)::float as "score", count(*)::int as "people", max(p.last_at) as "lastAt"
    from (
      select d.user_id, d.target_id, least(sum(d.weight), ${POPULARITY_PERSON_CAP}) as person_score, max(d.at) as last_at
      from (
        select distinct on (g.user_id, g.target_id, g.gesture) g.user_id, g.target_id, g.gesture, g.weight, g.at
        from (${gesturesOf(kind)}) g
        join app_user au on au.id = g.user_id and au.deactivated_at is null
        where g.target_id is not null ${window}
        order by g.user_id, g.target_id, g.gesture, g.at desc
      ) d
      group by d.user_id, d.target_id
    ) p
    group by p.target_id
    having count(*) >= ${options.minPeople}
    order by sum(p.person_score) desc, count(*) desc, max(p.last_at) desc, p.target_id
    ${limit}
  `;
}

async function scores(kind: PopularKind, since: string | undefined, minPeople: number, limit: number): Promise<PopularScore[]> {
  const rows = (await db.execute(popularityScoreQuery(kind, { since, minPeople, limit }))) as unknown as {
    id: string;
    score: number;
    people: number;
  }[];
  return rows.map((row) => ({ id: row.id, score: Number(row.score), people: Number(row.people) }));
}

/**
 * Álbumes populares de un intervalo cerrado-abierto (`[start, end)`, ISO), del más al menos popular, con al menos `minPeople`
 * personas. Lo usa la colección "Lo más popular del mes".
 */
export function popularAlbumsBetween(bounds: { start: string; end: string }, minPeople: number, limit: number): Promise<PopularScore[]> {
  return db
    .execute(popularityScoreQuery("album", { since: bounds.start, until: bounds.end, minPeople, limit }))
    .then((rows) => (rows as unknown as PopularScore[]).map((row) => ({ id: row.id, score: Number(row.score), people: Number(row.people) })));
}

/** Personas distintas de cada álbum de `ids` en el intervalo, en una consulta (para la cartela de la colección mensual). */
export async function popularPeopleOf(ids: string[], bounds: { start: string; end: string }): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = (await db.execute(
    popularityScoreQuery("album", { since: bounds.start, until: bounds.end, ids, minPeople: 1 }),
  )) as unknown as PopularScore[];
  return new Map(rows.map((row) => [row.id, Number(row.people)]));
}

/**
 * Lo popular ahora de un tipo: el primer escalón de ventana (30 días, 90, siempre) que llega al mínimo del tipo. `null` si ninguno
 * llega (el tipo no se muestra).
 */
export async function popularNow(kind: PopularKind, now: Date = new Date()): Promise<PopularResult | null> {
  const min = POPULAR_MIN[kind];
  const limit = Math.max(POPULAR_LIMIT[kind], min);
  for (const step of POPULAR_WINDOWS) {
    const since = step.days === null ? undefined : new Date(now.getTime() - step.days * 24 * 3600 * 1000).toISOString();
    const items = await scores(kind, since, step.minPeople, limit);
    if (items.length >= min) return { window: step.window, items: items.slice(0, POPULAR_LIMIT[kind]) };
  }
  return null;
}

export interface PopularNowAll {
  albums: PopularResult | null;
  artists: PopularResult | null;
  songs: PopularResult | null;
}

const cache = createTtlCache<PopularNowAll>({
  ttlMs: POPULAR_NOW_TTL_MS,
  load: async () => {
    const [albums, artists, songs] = await Promise.all([popularNow("album"), popularNow("artist"), popularNow("song")]);
    return { albums, artists, songs };
  },
  onError: () => ({ albums: null, artists: null, songs: null }),
  errorLabel: "No se pudo calcular lo popular ahora",
});

/** Los tres tipos de "Popular ahora", con caché de 15 minutos. Un error deja la sección sin contenido (se omite). */
export function listPopularNow(now?: number): Promise<PopularNowAll> {
  return cache.get(now);
}

/** Solo para pruebas. */
export function resetPopularNowCache(): void {
  cache.reset();
}

const allTimeCache = createTtlCache<string[]>({
  ttlMs: POPULAR_NOW_TTL_MS,
  load: async () => (await scores("album", undefined, 1, 100_000)).map((item) => item.id),
  onError: () => [],
  errorLabel: "No se pudo calcular la popularidad de siempre de los álbumes",
});

/**
 * Los álbumes con alguna actividad, del más al menos popular de siempre, para el orden "Populares" de los listados (el listado
 * ordena por la posición en esta lista y deja al final, en orden "Destacados", los que no tienen actividad). Crece con la
 * actividad, no con el catálogo. Caché de 15 minutos; un error devuelve `[]` (el listado queda en orden "Destacados").
 */
export function allTimeAlbumRanking(now?: number): Promise<string[]> {
  return allTimeCache.get(now);
}

/** Solo para pruebas. */
export function resetAllTimeRankingCache(): void {
  allTimeCache.reset();
}
