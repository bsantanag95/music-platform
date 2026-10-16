import { sql } from "drizzle-orm";
import { db } from "@/db";
import { albumSignalOrder } from "./collections/signal";

// Carátulas de las tarjetas de familia de géneros de `/explore` (openspec: visual-genre-families). Cada tarjeta es un
// mosaico de hasta `COVERS_PER_FAMILY` carátulas de discos de estudio de la familia, elegidos por la misma señal de calidad
// que ordena las colecciones del día 0 (premio, calendario y, si la comunidad ya opinó, su valoración) con desempate por id,
// de modo que son estables entre visitas. Un disco se usa en una sola familia: los géneros se solapan y, sin esto, los mismos
// discos premiados repetirían en Rock, Pop, R&B y Folk, y las tarjetas se parecerían entre sí.

export const COVERS_PER_FAMILY = 4;

/** Cuántos candidatos por familia se leen para poder repartirlos sin repetir: el margen para ceder discos a otras familias. */
const CANDIDATES_PER_FAMILY = COVERS_PER_FAMILY * 4;

/** Cuánto vale el resultado en memoria: cambia solo cuando entran discos nuevos o cambia la señal. */
export const FAMILY_COVERS_TTL_MS = 6 * 60 * 60 * 1000;

export type FamilyCovers = Map<string, string[]>;

export interface CoverCandidate {
  familyKey: string;
  albumId: string;
  cover: string;
}

/**
 * Reparte los candidatos (ya en el orden de la señal dentro de cada familia) sin repetir discos entre familias. Se atiende
 * primero a la familia con menos candidatos, para que las pequeñas no se queden sin los pocos discos que tienen, y cada una
 * toma sus mejores discos que nadie haya tomado. Si una familia se queda con menos de dos discos propios, se completa con
 * discos ya usados por otra (mejor un mosaico repetido que una sola carátula a sangre). Determinista: el desempate es la clave.
 */
export function assignCovers(candidates: CoverCandidate[]): FamilyCovers {
  const byFamily = new Map<string, CoverCandidate[]>();
  for (const candidate of candidates) byFamily.set(candidate.familyKey, [...(byFamily.get(candidate.familyKey) ?? []), candidate]);

  const order = [...byFamily.entries()].sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]));
  const used = new Set<string>();
  const result: FamilyCovers = new Map();
  for (const [familyKey, list] of order) {
    const own = list.filter((c) => !used.has(c.albumId)).slice(0, COVERS_PER_FAMILY);
    own.forEach((c) => used.add(c.albumId));
    const picked = [...own];
    if (picked.length < 2) {
      for (const c of list) {
        if (picked.length >= Math.min(2, list.length)) break;
        if (!picked.includes(c)) picked.push(c);
      }
    }
    result.set(familyKey, picked.map((c) => c.cover));
  }
  return result;
}

/**
 * Una sola consulta con ventana, no una por familia. Los discos se ordenan por la señal dentro de cada familia y se
 * toman los primeros candidatos. `albumSignalOrder` se correlaciona con `"release_group"."id"`, de ahí que la consulta
 * exterior sea sobre `release_group` sin alias.
 */
async function queryFamilyCovers(): Promise<FamilyCovers> {
  const rows = (await db.execute(sql`
    select ranked.family_key as "familyKey", ranked.album_id as "albumId", ranked.cover as "cover"
    from (
      select
        m.family_key,
        "release_group"."id" as album_id,
        "release_group"."cover_thumb_url" as cover,
        row_number() over (partition by m.family_key order by ${sql.join(albumSignalOrder(), sql`, `)}) as rn
      from "release_group"
      join (
        select distinct e.release_group_id, fm.family_key
        from release_group_effective_genre e
        join genre_family_member fm on fm.genre_id = e.genre_id
        join genre g on g.id = e.genre_id and g.kind = 'style'
      ) m on m.release_group_id = "release_group"."id"
      where "release_group"."category" = 'studio' and "release_group"."cover_thumb_url" is not null
    ) ranked
    where ranked.rn <= ${CANDIDATES_PER_FAMILY}
    order by ranked.family_key, ranked.rn
  `)) as unknown as CoverCandidate[];
  return assignCovers(rows);
}

let cached: { at: number; value: FamilyCovers } | null = null;
let inFlight: Promise<FamilyCovers> | null = null;

/**
 * Carátulas por familia, con caché en memoria (`FAMILY_COVERS_TTL_MS`): la consulta tarda cerca de un segundo en frío y
 * `/explore` no puede pagarla en cada visita. Las visitas simultáneas comparten una sola consulta. Un error no se cachea:
 * devuelve el mapa vacío (la portada pinta tarjetas planas) y se reintenta en la próxima visita.
 */
export async function listFamilyCovers(now: number = Date.now()): Promise<FamilyCovers> {
  if (cached && now - cached.at < FAMILY_COVERS_TTL_MS) return cached.value;
  if (!inFlight) {
    inFlight = queryFamilyCovers()
      .then((value) => {
        cached = { at: now, value };
        return value;
      })
      .catch((error) => {
        console.error("No se pudieron leer las carátulas de las familias de géneros", error);
        return new Map<string, string[]>();
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Solo para pruebas: vacía la caché. */
export function resetFamilyCoversCache(): void {
  cached = null;
  inFlight = null;
}
