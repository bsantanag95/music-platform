// Tu año en discos (openspec: add-year-in-discs-phase1, docs/05-features/sharing.md §4.4.1): el año de una persona en discos, mes por mes, y sus cifras,
// derivado del diario. Es una Lámina derivada: no se guarda, se calcula en cada lectura. Nunca muestra el texto de una escucha, su reacción ni una nota.
//
// Las escuchas tienen audiencia propia y nacen privadas: el año lo ve su dueño, y a cualquier otra persona se lo abre solo la marca de `year_share`, que no
// cambia la audiencia de ninguna escucha. La marca guarda la zona horaria del dueño al compartir: los meses se cuentan en esa zona para cualquier otra lectura.

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { yearShare } from "@/db/schema";
import { listMyDiaryMonths } from "@/services/diary/diary";
import { ifVisible } from "@/services/share/targets/shared";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";

export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

export interface YearDisc {
  id: string;
  title: string;
  artistName: string | null;
  coverThumbUrl: string | null;
  /** Escuchas de ese disco en ese mes (o en el año, en `topDiscs`). */
  listens: number;
}

export interface YearMonth {
  /** 1 a 12. */
  month: number;
  discs: YearDisc[];
}

export interface YearStats {
  listens: number;
  discs: number;
  newDiscs: number;
  artistsDiscovered: number;
}

export interface YearInDiscs {
  year: number;
  /** Los doce meses, vacíos incluidos. */
  months: YearMonth[];
  stats: YearStats;
  /** Los discos más escuchados del año, para la imagen. */
  topDiscs: YearDisc[];
}

export interface YearInDiscsView extends YearInDiscs {
  owner: { id: string; username: string; displayName: string | null };
  isOwner: boolean;
  shared: boolean;
  /** El año en curso, en la zona con la que se cuenta: "hasta ahora". */
  inProgress: boolean;
  timeZone: string;
}

const TOP_DISCS = 4;

/** Un año válido como número, o `null`. */
export function parseYear(value: string | number | null | undefined): number | null {
  const year = typeof value === "number" ? value : /^\d{4}$/.test(value ?? "") ? Number(value) : NaN;
  return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX ? year : null;
}

/** El año calendario de hoy en una zona. */
export function currentYearIn(timeZone: string, now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(now));
}

type DiscRow = { month: number; id: string; title: string; artist_name: string | null; cover_thumb_url: string | null; listens: number };

/** Rango del año en la zona: `make_timestamptz` deja usar el índice por usuario y fecha. */
function yearRange(year: number, timeZone: string) {
  const start = sql`make_timestamptz(${year}::int, 1, 1, 0, 0, 0, ${timeZone}::text)`;
  const end = sql`make_timestamptz(${year + 1}::int, 1, 1, 0, 0, 0, ${timeZone}::text)`;
  return { start, end };
}

/** El año de una persona en una zona, o `null` si ese año no tiene escuchas. */
export async function readYearInDiscs(ownerId: string, year: number, timeZone: string): Promise<YearInDiscs | null> {
  const { start, end } = yearRange(year, timeZone);
  const inYear = sql`le.user_id = ${ownerId}::uuid AND le.created_at >= ${start} AND le.created_at < ${end}`;

  const [totals] = await db.execute<{ listens: number; new_discs: number }>(sql`
    SELECT count(*)::int AS listens,
           count(DISTINCT le.release_group_id) FILTER (WHERE le.listen_context = 'first_listen')::int AS new_discs
    FROM listen_entry le
    WHERE ${inYear}`);
  if (!totals || Number(totals.listens) === 0) return null;

  // Por mes, cada disco una vez, primero el más escuchado ese mes y después el de la primera escucha más temprana. Agrupado por posición: la zona viaja
  // como parámetro y Postgres no reconoce la misma expresión en el SELECT y en el GROUP BY (42803).
  const rows = await db.execute<DiscRow>(sql`
    SELECT extract(month from le.created_at AT TIME ZONE ${timeZone}::text)::int AS month,
           rg.id, rg.title, rg.cover_thumb_url,
           (SELECT a.name FROM credit c JOIN artist a ON a.id = c.artist_id
             WHERE c.release_group_id = rg.id AND c.role = 'primary' ORDER BY c.position LIMIT 1) AS artist_name,
           count(*)::int AS listens,
           min(le.created_at) AS first_at
    FROM listen_entry le
    JOIN release_group rg ON rg.id = le.release_group_id
    WHERE ${inYear}
    GROUP BY 1, 2, 3, 4
    ORDER BY 1, listens DESC, first_at, rg.id`);

  // Artistas principales de los discos del año cuya primera escucha en la cuenta (de cualquier disco suyo o del artista) cae en el año. Todos tienen una
  // escucha en el año, así que su primera es anterior al final: basta mirar el comienzo.
  const [discovered] = await db.execute<{ n: number }>(sql`
    WITH year_artists AS (
      SELECT DISTINCT c.artist_id
      FROM listen_entry le
      JOIN credit c ON c.release_group_id = le.release_group_id AND c.role = 'primary'
      WHERE ${inYear}
    )
    SELECT count(*)::int AS n
    FROM year_artists ya
    WHERE NOT EXISTS (
      SELECT 1 FROM listen_entry prev
      LEFT JOIN credit pc ON pc.release_group_id = prev.release_group_id AND pc.role = 'primary'
      WHERE prev.user_id = ${ownerId}::uuid AND prev.created_at < ${start}
        AND (prev.artist_id = ya.artist_id OR pc.artist_id = ya.artist_id)
    )`);

  const months: YearMonth[] = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, discs: [] }));
  const totalsByDisc = new Map<string, YearDisc>();
  for (const row of rows) {
    const disc: YearDisc = { id: row.id, title: row.title, artistName: row.artist_name, coverThumbUrl: row.cover_thumb_url, listens: Number(row.listens) };
    months[Number(row.month) - 1]!.discs.push(disc);
    const total = totalsByDisc.get(disc.id);
    totalsByDisc.set(disc.id, total ? { ...total, listens: total.listens + disc.listens } : { ...disc });
  }
  // Sort estable: a igual cantidad de escuchas, queda el orden del calendario (el que se escuchó antes).
  const topDiscs = [...totalsByDisc.values()].sort((a, b) => b.listens - a.listens).slice(0, TOP_DISCS);

  return {
    year,
    months,
    stats: {
      listens: Number(totals.listens),
      discs: totalsByDisc.size,
      newDiscs: Number(totals.new_discs),
      artistsDiscovered: Number(discovered?.n ?? 0),
    },
    topDiscs,
  };
}

/** La marca del año, con la zona guardada, o `null`. */
export async function readYearShare(ownerId: string, year: number): Promise<{ timeZone: string } | null> {
  const [row] = await db
    .select({ timeZone: yearShare.timeZone })
    .from(yearShare)
    .where(and(eq(yearShare.userId, ownerId), eq(yearShare.year, year)))
    .limit(1);
  return row ?? null;
}

/** Comparte el año guardando la zona del dueño; si ya estaba, actualiza la zona. */
export async function markYearShared(ownerId: string, year: number, timeZone: string): Promise<void> {
  await db
    .insert(yearShare)
    .values({ userId: ownerId, year, timeZone })
    .onConflictDoUpdate({ target: [yearShare.userId, yearShare.year], set: { timeZone } });
}

export async function unmarkYearShared(ownerId: string, year: number): Promise<void> {
  await db.delete(yearShare).where(and(eq(yearShare.userId, ownerId), eq(yearShare.year, year)));
}

/**
 * El año para quien mira, o `null` sin revelar el motivo. El dueño lo ve siempre, en su zona (`viewerTimeZone`); cualquier otra persona, solo con la marca
 * y si puede ver el perfil, en la zona guardada en la marca.
 */
export async function getYearInDiscs(username: string, year: number, viewerId: string | null, viewerTimeZone: string): Promise<YearInDiscsView | null> {
  const profile = await ifVisible(getProfileByUsername(username, viewerId));
  if (!profile || audiencesForProfile(profile).length === 0) return null;
  const isOwner = profile.relation === "self";
  const share = await readYearShare(profile.id, year);
  if (!isOwner && !share) return null;
  const timeZone = isOwner ? viewerTimeZone : share!.timeZone;
  const data = await readYearInDiscs(profile.id, year, timeZone);
  if (!data) return null;
  return {
    ...data,
    owner: { id: profile.id, username: profile.username, displayName: profile.displayName },
    isOwner,
    shared: Boolean(share),
    inProgress: year === currentYearIn(timeZone),
    timeZone,
  };
}

/** Años con escuchas, del más reciente al más viejo, en la zona del dueño: "Tus años". */
export async function listYearsWithListens(ownerId: string, timeZone: string): Promise<number[]> {
  const months = await listMyDiaryMonths(ownerId, timeZone);
  return [...new Set(months.map((bucket) => bucket.year))].filter((year) => parseYear(year) !== null);
}
