// Tu año en discos (openspec: add-year-in-discs-phase1, docs/05-features/sharing.md §4.4.1): el año de una persona en discos, mes por mes, y sus cifras,
// derivado del diario. Es una Lámina derivada: no se guarda, se calcula en cada lectura. Nunca muestra el texto de una escucha, su reacción ni una nota.
//
// Fase 2 (add-year-in-discs-phase2): el dueño cura su año. Su Top 5 se prellena con sus discos del año mejor valorados y lo puede elegir (`year_top`); un
// disco oculto (`year_hidden`) desaparece del calendario, del Top 5, de la imagen y de las cifras. Las notas nunca salen: solo ordenan el prellenado.
//
// Las escuchas tienen audiencia propia y nacen privadas: el año lo ve su dueño, y a cualquier otra persona se lo abre solo la marca de `year_share`, que no
// cambia la audiencia de ninguna escucha. La marca guarda la zona horaria del dueño al compartir: los meses se cuentan en esa zona para cualquier otra lectura.

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { rating, releaseGroup, yearHidden, yearShare, yearTop } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
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
  /** Top 5 del año: el elegido por el dueño o, sin elección, el prellenado por su nota. */
  top: YearDisc[];
  /** Si el Top 5 es el que eligió el dueño. */
  topIsCustom: boolean;
}

/** Disco del año para el selector del dueño, con su nota: nunca sale de la vista del dueño. */
export interface YearDiscChoice extends YearDisc {
  score: { stars: number; detailedScore: number | null } | null;
}

export interface YearInDiscsView extends YearInDiscs {
  owner: { id: string; username: string; displayName: string | null };
  isOwner: boolean;
  shared: boolean;
  /** El año en curso, en la zona con la que se cuenta: "hasta ahora". */
  inProgress: boolean;
  timeZone: string;
  /** Solo para el dueño: los discos del año con su nota, para elegir el Top 5, y sus ocultos. Vacíos para cualquier otra persona. */
  choices: YearDiscChoice[];
  hidden: YearDisc[];
}

export const YEAR_TOP_SIZE = 5;

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
export async function readYearInDiscs(ownerId: string, year: number, timeZone: string): Promise<(YearInDiscs & { choices: YearDiscChoice[] }) | null> {
  const { start, end } = yearRange(year, timeZone);
  // Las escuchas de un disco oculto ese año no cuentan en nada (calendario, cifras, Top 5); las de canciones y artistas, sí.
  const inYear = sql`le.user_id = ${ownerId}::uuid AND le.created_at >= ${start} AND le.created_at < ${end}
    AND (le.release_group_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM year_hidden yh WHERE yh.user_id = le.user_id AND yh.year = ${year}::int AND yh.release_group_id = le.release_group_id))`;

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
  const choices = await withScores(ownerId, [...totalsByDisc.values()]);
  const saved = await db
    .select({ id: yearTop.releaseGroupId })
    .from(yearTop)
    .where(and(eq(yearTop.userId, ownerId), eq(yearTop.year, year)))
    .orderBy(asc(yearTop.position));
  const top = composeTop(choices, saved.map((row) => row.id));

  return {
    year,
    months,
    stats: {
      listens: Number(totals.listens),
      discs: totalsByDisc.size,
      newDiscs: Number(totals.new_discs),
      artistsDiscovered: Number(discovered?.n ?? 0),
    },
    top: top.discs,
    topIsCustom: top.custom,
    choices,
  };
}

/** Escala común para ordenar: la nota detallada si existe; si no, las estrellas × 20. */
function scoreValue(score: YearDiscChoice["score"]): number {
  return score ? (score.detailedScore ?? score.stars * 20) : -1;
}

async function withScores(ownerId: string, discs: YearDisc[]): Promise<YearDiscChoice[]> {
  if (discs.length === 0) return [];
  const rows = await db
    .select({ id: rating.releaseGroupId, stars: rating.stars, detailedScore: rating.detailedScore })
    .from(rating)
    .where(and(eq(rating.userId, ownerId), inArray(rating.releaseGroupId, discs.map((disc) => disc.id))));
  const byId = new Map(rows.flatMap((row) => (row.id ? [[row.id, { stars: Number(row.stars), detailedScore: row.detailedScore }] as const] : [])));
  return discs.map((disc) => ({ ...disc, score: byId.get(disc.id) ?? null }));
}

/** Un disco sin su nota: lo que sale del dueño hacia los demás. */
function withoutScore(choice: YearDiscChoice): YearDisc {
  return { id: choice.id, title: choice.title, artistName: choice.artistName, coverThumbUrl: choice.coverThumbUrl, listens: choice.listens };
}

/** Prellenado: de mejor a peor nota y, a igual nota, por escuchas; los sin nota, después, por escuchas. El orden del calendario desempata. */
export function prefillTop(choices: readonly YearDiscChoice[]): YearDisc[] {
  return [...choices]
    .sort((a, b) => scoreValue(b.score) - scoreValue(a.score) || b.listens - a.listens)
    .slice(0, YEAR_TOP_SIZE)
    .map(withoutScore);
}

/**
 * El Top 5 que se muestra: lo elegido que sigue siendo válido (escuchado ese año y no oculto), en su orden, completado con el prellenado. Sin elección, el
 * prellenado.
 */
export function composeTop(choices: readonly YearDiscChoice[], savedIds: readonly string[]): { discs: YearDisc[]; custom: boolean } {
  const byId = new Map(choices.map((choice) => [choice.id, withoutScore(choice)] as const));
  const kept = savedIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (savedIds.length === 0) return { discs: prefillTop(choices), custom: false };
  const filled = [...kept, ...prefillTop(choices).filter((disc) => !kept.some((k) => k.id === disc.id))].slice(0, YEAR_TOP_SIZE);
  return { discs: filled, custom: true };
}

function invalid(message: string): ApiError {
  return new ApiError("VALIDATION_ERROR", 400, message);
}

/** Discos con escuchas del dueño en ese año; con `includeHidden`, también los ocultos. */
async function discsListenedIn(ownerId: string, year: number, timeZone: string, includeHidden: boolean): Promise<Set<string>> {
  const { start, end } = yearRange(year, timeZone);
  const rows = await db.execute<{ id: string }>(sql`
    SELECT DISTINCT le.release_group_id AS id
    FROM listen_entry le
    WHERE le.user_id = ${ownerId}::uuid AND le.created_at >= ${start} AND le.created_at < ${end} AND le.release_group_id IS NOT NULL
      ${includeHidden ? sql`` : sql`AND NOT EXISTS (SELECT 1 FROM year_hidden yh WHERE yh.user_id = le.user_id AND yh.year = ${year}::int AND yh.release_group_id = le.release_group_id)`}`);
  return new Set(rows.map((row) => row.id));
}

/** Guarda el Top 5 elegido: de 1 a 5 discos, sin repetir, escuchados ese año y no ocultos. Reemplaza el anterior entero. */
export async function saveYearTop(ownerId: string, year: number, releaseGroupIds: readonly string[], timeZone: string): Promise<void> {
  const ids = [...releaseGroupIds];
  if (ids.length < 1 || ids.length > YEAR_TOP_SIZE || new Set(ids).size !== ids.length) {
    throw invalid(`El Top 5 lleva de 1 a ${YEAR_TOP_SIZE} discos sin repetir`);
  }
  const allowed = await discsListenedIn(ownerId, year, timeZone, false);
  if (ids.some((id) => !allowed.has(id))) throw invalid("Solo entran discos escuchados ese año y no ocultos");
  await db.transaction(async (tx) => {
    await tx.delete(yearTop).where(and(eq(yearTop.userId, ownerId), eq(yearTop.year, year)));
    await tx.insert(yearTop).values(ids.map((releaseGroupId, index) => ({ userId: ownerId, year, position: index + 1, releaseGroupId })));
  });
}

/** Vuelve al prellenado. */
export async function clearYearTop(ownerId: string, year: number): Promise<void> {
  await db.delete(yearTop).where(and(eq(yearTop.userId, ownerId), eq(yearTop.year, year)));
}

/** Oculta un disco escuchado ese año: deja de contar en todo, y sale del Top 5 elegido. No toca el diario. */
export async function hideYearDisc(ownerId: string, year: number, releaseGroupId: string, timeZone: string): Promise<void> {
  const listened = await discsListenedIn(ownerId, year, timeZone, true);
  if (!listened.has(releaseGroupId)) throw invalid("Ese disco no tiene escuchas ese año");
  await db.transaction(async (tx) => {
    await tx.insert(yearHidden).values({ userId: ownerId, year, releaseGroupId }).onConflictDoNothing();
    await tx.delete(yearTop).where(and(eq(yearTop.userId, ownerId), eq(yearTop.year, year), eq(yearTop.releaseGroupId, releaseGroupId)));
  });
}

export async function showYearDisc(ownerId: string, year: number, releaseGroupId: string): Promise<void> {
  await db
    .delete(yearHidden)
    .where(and(eq(yearHidden.userId, ownerId), eq(yearHidden.year, year), eq(yearHidden.releaseGroupId, releaseGroupId)));
}

/** Los ocultos de un año, para que su dueño los vuelva a mostrar. */
export async function listHiddenYearDiscs(ownerId: string, year: number): Promise<YearDisc[]> {
  const rows = await db
    .select({ id: releaseGroup.id, title: releaseGroup.title, coverThumbUrl: releaseGroup.coverThumbUrl })
    .from(yearHidden)
    .innerJoin(releaseGroup, eq(releaseGroup.id, yearHidden.releaseGroupId))
    .where(and(eq(yearHidden.userId, ownerId), eq(yearHidden.year, year)))
    .orderBy(asc(yearHidden.hiddenAt));
  return rows.map((row) => ({ ...row, artistName: null, listens: 0 }));
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
  const read = await readYearInDiscs(profile.id, year, timeZone);
  if (!read) return null;
  const { choices, ...data } = read;
  return {
    ...data,
    // Las notas y los ocultos son del dueño: nadie más los recibe.
    choices: isOwner ? choices : [],
    hidden: isOwner ? await listHiddenYearDiscs(profile.id, year) : [],
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
