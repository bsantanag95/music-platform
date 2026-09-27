import { sql } from "drizzle-orm";
import { db } from "@/db";

// Versiones de una canción por su obra (openspec: redesign-song-page, capability
// `song-versions`, ADR 0020). Qué versión es una grabación lo dicen los atributos de su
// vínculo con la obra (`recording_work.attributes`: `live`, `cover`, `instrumental`, …),
// tal como vienen de MusicBrainz; nunca se deducen de otros datos. Todo se lee de la base
// propia, sin requests a MusicBrainz.

/** Disco (release-group) con lo necesario para ordenarlo. */
export interface DiscOrderFields {
  releaseGroupId: string;
  category: string;
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
}

/** Clave de fecha: fecha exacta, si no el año, si no al final. */
export function discDateKey(disc: Pick<DiscOrderFields, "firstReleaseDate" | "firstReleaseYear">): string {
  return disc.firstReleaseDate ?? `${String(disc.firstReleaseYear ?? 9999).padStart(4, "0")}-99-99`;
}

/** Disco más temprano primero (sin mirar el tipo); desempate por id. */
export function compareDiscsByDate(a: DiscOrderFields, b: DiscOrderFields): number {
  return discDateKey(a).localeCompare(discDateKey(b)) || a.releaseGroupId.localeCompare(b.releaseGroupId);
}

/**
 * Orden del disco principal y de la grabación original (design D3): los discos de estudio
 * primero, después el más temprano, después el id. `DISC_ORDER_SQL` es el mismo orden en SQL.
 */
export function compareDiscs(a: DiscOrderFields, b: DiscOrderFields): number {
  const studio = Number(b.category === "studio") - Number(a.category === "studio");
  return studio || compareDiscsByDate(a, b);
}

/** Mejor disco según `compareDiscs`, o `null` sin discos. */
export function pickPrincipalDisc<T extends DiscOrderFields>(discs: T[]): T | null {
  return discs.reduce<T | null>((best, disc) => (best === null || compareDiscs(disc, best) < 0 ? disc : best), null);
}

// Espejo SQL de `compareDiscs` sobre un release-group con alias `rg`.
const DISC_ORDER_SQL = sql.raw(
  `(rg.category = 'studio') DESC, ` +
    `coalesce(rg.first_release_date::text, lpad(coalesce(rg.first_release_year, 9999)::text, 4, '0') || '-99-99'), ` +
    `rg.id`,
);

const VERSION_KIND_ATTRIBUTES = ["cover", "live"] as const;

/** Unión ordenada y sin repetidos de los atributos de los vínculos de una grabación. */
export function mergeAttributes(lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort();
}

/** Atributos de versión de un conjunto de grabaciones (vacío si no tienen obra). */
export async function loadVersionAttributes(recordingIds: string[]): Promise<Map<string, string[]>> {
  const unique = [...new Set(recordingIds)];
  const result = new Map<string, string[]>(unique.map((id) => [id, []]));
  if (unique.length === 0) return result;

  const rows = (await db.execute(sql`
    SELECT recording_id, attributes FROM recording_work
    WHERE recording_id IN ${idList(unique)}
  `)) as unknown as { recording_id: string; attributes: string[] }[];

  const lists = new Map<string, string[][]>();
  for (const row of rows) {
    const current = lists.get(row.recording_id) ?? [];
    current.push(row.attributes);
    lists.set(row.recording_id, current);
  }
  for (const [id, attributeLists] of lists) result.set(id, mergeAttributes(attributeLists));
  return result;
}

/** ¿Los atributos dicen que es una versión (en vivo o cover) de otra grabación? */
export function isVersionOfAnother(attributes: string[]): boolean {
  return VERSION_KIND_ATTRIBUTES.some((kind) => attributes.includes(kind));
}

export interface WorkOriginal {
  workId: string;
  recordingId: string;
  title: string;
  artistName: string | null;
}

/**
 * Grabación original de cada obra (design D3): entre las grabaciones de la obra sin `live`
 * ni `cover`, la de mejor disco según `compareDiscs`. Una obra sin ninguna grabación así no
 * tiene original. Una consulta para todas las obras.
 */
export async function resolveWorkOriginals(workIds: string[]): Promise<Map<string, WorkOriginal>> {
  const unique = [...new Set(workIds)];
  if (unique.length === 0) return new Map();

  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (rw.work_id)
      rw.work_id, rw.recording_id, r.title,
      (SELECT a.name FROM credit c JOIN artist a ON a.id = c.artist_id
        WHERE c.recording_id = r.id AND c.role = 'primary' ORDER BY c.position LIMIT 1) AS artist_name
    FROM recording_work rw
    JOIN recording r ON r.id = rw.recording_id
    JOIN track t ON t.recording_id = rw.recording_id
    JOIN release rl ON rl.id = t.release_id
    JOIN release_group rg ON rg.id = rl.release_group_id
    WHERE rw.work_id IN ${idList(unique)}
      AND NOT (rw.attributes && ARRAY['live', 'cover']::text[])
    ORDER BY rw.work_id, ${DISC_ORDER_SQL}, rw.recording_id
  `)) as unknown as { work_id: string; recording_id: string; title: string; artist_name: string | null }[];

  return new Map(
    rows.map((row) => [
      row.work_id,
      { workId: row.work_id, recordingId: row.recording_id, title: row.title, artistName: row.artist_name },
    ]),
  );
}

/** Obras de un conjunto de grabaciones: `recordingId → workIds` (ordenadas). */
export async function loadRecordingWorks(recordingIds: string[]): Promise<Map<string, string[]>> {
  const unique = [...new Set(recordingIds)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(sql`
    SELECT recording_id, work_id FROM recording_work
    WHERE recording_id IN ${idList(unique)}
    ORDER BY recording_id, work_id
  `)) as unknown as { recording_id: string; work_id: string }[];
  const works = new Map<string, string[]>();
  for (const row of rows) works.set(row.recording_id, [...(works.get(row.recording_id) ?? []), row.work_id]);
  return works;
}

export interface VersionOf {
  recordingId: string;
  title: string;
  artistName: string | null;
}

/**
 * La grabación de la que cada una es versión (en vivo o cover), cuando su obra tiene una
 * original distinta de ella; `null` en cualquier otro caso. Tres consultas en total.
 */
export async function resolveVersionOf(
  recordingIds: string[],
  attributesById?: Map<string, string[]>,
): Promise<Map<string, VersionOf | null>> {
  const attributes = attributesById ?? (await loadVersionAttributes(recordingIds));
  const candidates = recordingIds.filter((id) => isVersionOfAnother(attributes.get(id) ?? []));
  const result = new Map<string, VersionOf | null>(recordingIds.map((id) => [id, null]));
  if (candidates.length === 0) return result;

  const works = await loadRecordingWorks(candidates);
  const originals = await resolveWorkOriginals([...works.values()].flat());
  for (const id of candidates) {
    const original = (works.get(id) ?? [])
      .map((workId) => originals.get(workId))
      .find((o): o is WorkOriginal => o !== undefined && o.recordingId !== id);
    if (original) {
      result.set(id, { recordingId: original.recordingId, title: original.title, artistName: original.artistName });
    }
  }
  return result;
}

export interface VersionLine {
  kind: "cover" | "live";
  original: VersionOf;
}

/**
 * Línea "Versión de…" de la cabecera de la canción (`song-versions`): solo si la grabación es
 * cover o en vivo y su obra tiene una original distinta de ella.
 */
export async function resolveVersionLine(recordingId: string, attributes: string[]): Promise<VersionLine | null> {
  if (!isVersionOfAnother(attributes)) return null;
  const original = (await resolveVersionOf([recordingId], new Map([[recordingId, attributes]]))).get(recordingId);
  if (!original) return null;
  return { kind: attributes.includes("cover") ? "cover" : "live", original };
}

export type VersionGroup = "covers" | "live" | "others";

export interface VersionDisc {
  releaseGroupId: string;
  title: string;
  year: number | null;
}

export interface VersionEntry {
  recordingId: string;
  title: string;
  durationSec: number | null;
  artist: { id: string; name: string } | null;
  attributes: string[];
  /** Disco principal de la grabación (mismo criterio que la canción). */
  disc: VersionDisc | null;
  /** Clave de fecha de su disco más temprano, para ordenar. */
  earliestKey: string;
}

export type RecordingVersions = Record<VersionGroup, VersionEntry[]>;

/** Grupo de una grabación según sus atributos (design D4). */
export function versionGroupOf(attributes: string[]): VersionGroup {
  if (attributes.includes("cover")) return "covers";
  if (attributes.includes("live")) return "live";
  return "others";
}

/** Reparte las grabaciones en grupos, sin la actual, por fecha del disco más temprano. */
export function groupVersions(entries: VersionEntry[], currentRecordingId: string): RecordingVersions {
  const groups: RecordingVersions = { covers: [], live: [], others: [] };
  for (const entry of entries) {
    if (entry.recordingId === currentRecordingId) continue;
    groups[versionGroupOf(entry.attributes)].push(entry);
  }
  const byDate = (a: VersionEntry, b: VersionEntry) =>
    a.earliestKey.localeCompare(b.earliestKey) || a.title.localeCompare(b.title) || a.recordingId.localeCompare(b.recordingId);
  for (const group of Object.values(groups)) group.sort(byDate);
  return groups;
}

interface VersionRow {
  recording_id: string;
  title: string;
  duration_sec: number | null;
  attributes: string[];
  artist_id: string | null;
  artist_name: string | null;
  release_group_id: string | null;
  disc_title: string | null;
  category: string | null;
  first_release_date: string | null;
  first_release_year: number | null;
}

/** Arma una entrada por grabación a partir de las filas (una por grabación × disco × obra). */
export function buildVersionEntries(rows: VersionRow[]): VersionEntry[] {
  type Accumulated = { row: VersionRow; attributes: string[][]; discs: Map<string, DiscOrderFields & { title: string }> };
  const byRecording = new Map<string, Accumulated>();
  for (const row of rows) {
    const current: Accumulated = byRecording.get(row.recording_id) ?? { row, attributes: [], discs: new Map() };
    current.attributes.push(row.attributes);
    if (row.release_group_id && row.category && row.disc_title !== null) {
      current.discs.set(row.release_group_id, {
        releaseGroupId: row.release_group_id,
        title: row.disc_title,
        category: row.category,
        firstReleaseDate: row.first_release_date,
        firstReleaseYear: row.first_release_year,
      });
    }
    byRecording.set(row.recording_id, current);
  }

  return [...byRecording.values()].map(({ row, attributes, discs }) => {
    const all = [...discs.values()];
    const principal = pickPrincipalDisc(all);
    const earliest = [...all].sort(compareDiscsByDate)[0];
    return {
      recordingId: row.recording_id,
      title: row.title,
      durationSec: row.duration_sec,
      artist: row.artist_id && row.artist_name ? { id: row.artist_id, name: row.artist_name } : null,
      attributes: mergeAttributes(attributes),
      disc: principal ? { releaseGroupId: principal.releaseGroupId, title: principal.title, year: principal.firstReleaseYear } : null,
      earliestKey: earliest ? discDateKey(earliest) : "9999-99-99",
    };
  });
}

/**
 * Otras versiones de una grabación: las demás grabaciones de sus obras, agrupadas por
 * atributos (design D4). `null` si la grabación no tiene obra. Una consulta.
 */
export async function getRecordingVersions(recordingId: string): Promise<RecordingVersions | null> {
  const rows = (await db.execute(sql`
    WITH own_works AS (
      SELECT work_id FROM recording_work WHERE recording_id = ${recordingId}
    )
    SELECT
      r.id AS recording_id, r.title, r.duration_sec, rw.attributes,
      pa.id AS artist_id, pa.name AS artist_name,
      rg.id AS release_group_id, rg.title AS disc_title, rg.category,
      rg.first_release_date::text AS first_release_date, rg.first_release_year
    FROM recording_work rw
    JOIN own_works ow ON ow.work_id = rw.work_id
    JOIN recording r ON r.id = rw.recording_id
    LEFT JOIN LATERAL (
      SELECT a.id, a.name FROM credit c JOIN artist a ON a.id = c.artist_id
      WHERE c.recording_id = r.id AND c.role = 'primary' ORDER BY c.position LIMIT 1
    ) pa ON true
    LEFT JOIN LATERAL (
      SELECT DISTINCT rg2.id, rg2.title, rg2.category, rg2.first_release_date, rg2.first_release_year
      FROM track t
      JOIN release rl ON rl.id = t.release_id
      JOIN release_group rg2 ON rg2.id = rl.release_group_id
      WHERE t.recording_id = r.id
    ) rg ON true
  `)) as unknown as VersionRow[];

  if (rows.length === 0) return null;
  return groupVersions(buildVersionEntries(rows), recordingId);
}

function idList(ids: string[]) {
  return sql`(${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
}
