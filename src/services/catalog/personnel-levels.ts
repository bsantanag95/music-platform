import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, membership, personnelCredit, recordingWork, release, track, workCredit } from "@/db/schema";

// Clasificación de los créditos de personal de un álbum en niveles (openspec:
// enrich-album-editions-and-credits, design.md D8). Se guardan todos los tipos de relación
// de MusicBrainz; esta tabla fija decide qué nivel ocupa cada uno al leer. Un tipo que no
// esté acá cae en "Arte y otros": nunca se pierde.

export type PersonnelLevel = "members" | "guests" | "production" | "other";

const PERFORMER_TYPES = new Set([
  "instrument",
  "vocal",
  "performer",
  "performing orchestra",
  "conductor",
  "chorus master",
  "concertmaster",
]);

const PRODUCTION_TYPES = new Set([
  "producer",
  "engineer",
  "audio",
  "sound",
  "recording",
  "mix",
  "mastering",
  "programming",
  "editor",
  "balance",
]);

export function relationKind(relationType: string): "performer" | "production" | "other" {
  if (PERFORMER_TYPES.has(relationType)) return "performer";
  if (PRODUCTION_TYPES.has(relationType)) return "production";
  return "other";
}

export interface PersonnelCreditInput {
  artistId: string;
  name: string;
  creditedAs: string | null;
  relationType: string;
  attributes: string[];
  /** `null` = crédito de nivel edición (todo el álbum). */
  recordingId: string | null;
}

export interface PersonnelRole {
  relationType: string;
  attributes: string[];
}

export interface PersonnelEntry {
  artistId: string;
  name: string;
  creditedAs: string | null;
  level: PersonnelLevel;
  roles: PersonnelRole[];
  /** Pistas en que participa, o `"all"` si participa en todas (o tiene un crédito de nivel edición). */
  tracks: "all" | PersonnelTrackRef[];
}

export interface PersonnelTrackRef {
  recordingId: string;
  discNumber: number;
  position: number;
}

/**
 * Grupo de roles de la vista por canción (openspec: album-credits-by-song, D4). `songwriting`
 * son los autores de la obra de la pista (openspec: add-songwriter-credits).
 */
export type TrackCreditKind = "songwriting" | "production" | "performers" | "sound" | "other";

export interface TrackCreditPerson {
  artistId: string;
  name: string;
  creditedAs: string | null;
  roles: PersonnelRole[];
}

export type TrackCreditGroups = Record<TrackCreditKind, TrackCreditPerson[]>;

/**
 * Crédito de autoría de la obra de una pista del álbum (`work_credit` ⨝ `recording_work`):
 * la entrada de la lectura de autoría (openspec: add-songwriter-credits, D5).
 */
export interface SongwriterCreditInput {
  recordingId: string;
  artistId: string;
  name: string;
  creditedAs: string | null;
  relationType: string;
  attributes: string[];
}

/** Autora o autor del álbum: una vez, con sus roles y las pistas cuyas obras firmó. */
export interface SongwriterEntry {
  artistId: string;
  name: string;
  creditedAs: string | null;
  roles: PersonnelRole[];
  tracks: "all" | PersonnelTrackRef[];
}

export interface CreditsByTrack {
  /** Créditos de nivel edición: aplican a todo el álbum. */
  albumWide: TrackCreditGroups;
  /** Una entrada por pista con créditos, por `recordingId`. */
  tracks: Record<string, TrackCreditGroups>;
}

const LEVEL_ORDER: PersonnelLevel[] = ["members", "guests", "production", "other"];

/**
 * Agrupa por persona y la ubica en su nivel más alto: integrante (miembro de un artista
 * principal, o el propio artista principal si es una persona), invitado (intérprete),
 * producción y sonido, o arte y otros. Una persona aparece una sola vez, con todos sus
 * roles. Pura y determinista.
 */
export function classifyPersonnel(
  credits: PersonnelCreditInput[],
  albumTracks: { recordingId: string; discNumber: number; position: number }[],
  memberIds: Set<string>,
): Record<PersonnelLevel, PersonnelEntry[]> {
  const trackByRecording = new Map(albumTracks.map((t) => [t.recordingId, t]));
  const byArtist = new Map<string, PersonnelCreditInput[]>();
  for (const c of credits) {
    const list = byArtist.get(c.artistId) ?? [];
    list.push(c);
    byArtist.set(c.artistId, list);
  }

  const result: Record<PersonnelLevel, PersonnelEntry[]> = { members: [], guests: [], production: [], other: [] };
  for (const [artistId, list] of byArtist) {
    const kinds = new Set(list.map((c) => relationKind(c.relationType)));
    // Producir pesa más que tocar (openspec: album-credits-by-song, D1): en discos pop quien
    // produce una canción suele tocar todo, y no es un "músico invitado". Solo `producer`
    // promueve; programar o mezclar no.
    const level: PersonnelLevel = memberIds.has(artistId)
      ? "members"
      : list.some((c) => c.relationType === "producer")
        ? "production"
        : kinds.has("performer")
          ? "guests"
          : kinds.has("production")
            ? "production"
            : "other";

    const roleKeys = new Map<string, PersonnelRole>();
    for (const c of list) roleKeys.set(`${c.relationType}|${c.attributes.join(",")}`, { relationType: c.relationType, attributes: c.attributes });
    const roles = sortRolesForLevel([...roleKeys.values()], level);

    const hasReleaseLevel = list.some((c) => c.recordingId === null);
    const trackSet = new Map<string, PersonnelTrackRef>();
    for (const c of list) {
      const t = c.recordingId ? trackByRecording.get(c.recordingId) : undefined;
      if (t) trackSet.set(t.recordingId, { recordingId: t.recordingId, discNumber: t.discNumber, position: t.position });
    }
    const allTracks = hasReleaseLevel || (albumTracks.length > 0 && trackSet.size === albumTracks.length);

    result[level].push({
      artistId,
      name: list[0]!.name,
      creditedAs: list.find((c) => c.creditedAs)?.creditedAs ?? null,
      level,
      roles,
      tracks: allTracks
        ? "all"
        : [...trackSet.values()].sort((a, b) => a.discNumber - b.discNumber || a.position - b.position),
    });
  }

  const weight = (e: PersonnelEntry) => (e.tracks === "all" ? Number.MAX_SAFE_INTEGER : e.tracks.length);
  for (const level of LEVEL_ORDER) {
    result[level].sort((a, b) => weight(b) - weight(a) || a.name.localeCompare(b.name) || a.artistId.localeCompare(b.artistId));
  }
  return result;
}

/**
 * Tipo del artista principal, para rotular el primer nivel (openspec:
 * compact-album-credits, D1): `person` solo si todos los principales son personas.
 */
export type LeadKind = "person" | "group";

export function leadKindOf(primaryTypes: (string | null)[]): LeadKind {
  return primaryTypes.length > 0 && primaryTypes.every((type) => type === "person") ? "person" : "group";
}

export interface AlbumPersonnel {
  levels: Record<PersonnelLevel, PersonnelEntry[]>;
  leadKind: LeadKind;
  /**
   * Autoría de las obras del álbum, un eje aparte de los niveles: una persona puede figurar
   * aquí y además en su nivel de personal (openspec: add-songwriter-credits).
   */
  songwriters: SongwriterEntry[];
  /** Los mismos créditos agrupados por canción, para la vista "Por canción". */
  byTrack: CreditsByTrack;
  /** MBID de la edición representativa: la atribución enlaza ahí (openspec: album-credits-context). */
  releaseMbid: string | null;
}

/** Rango de un tipo de relación dentro de un nivel: lo que define el nivel va primero. */
function roleRank(relationType: string, level: PersonnelLevel): number {
  const kind = relationKind(relationType);
  if (level === "production") {
    if (relationType === "producer") return 0;
    return kind === "production" ? 1 : kind === "performer" ? 2 : 3;
  }
  if (level === "guests") return kind === "performer" ? 0 : relationType === "producer" ? 1 : kind === "production" ? 2 : 3;
  return 0;
}

/** Ordena los roles de una persona según su nivel (openspec: album-credits-by-song, D2). Estable. */
export function sortRolesForLevel(roles: PersonnelRole[], level: PersonnelLevel): PersonnelRole[] {
  return roles
    .map((role, index) => ({ role, index }))
    .sort((a, b) => roleRank(a.role.relationType, level) - roleRank(b.role.relationType, level) || a.index - b.index)
    .map(({ role }) => role);
}

function trackCreditKind(relationType: string): TrackCreditKind {
  if (relationType === "producer") return "production";
  const kind = relationKind(relationType);
  return kind === "performer" ? "performers" : kind === "production" ? "sound" : "other";
}

function emptyGroups(): TrackCreditGroups {
  return { songwriting: [], production: [], performers: [], sound: [], other: [] };
}

function addRole(list: TrackCreditPerson[], c: { artistId: string; name: string; creditedAs: string | null; relationType: string; attributes: string[] }) {
  let person = list.find((p) => p.artistId === c.artistId);
  if (!person) {
    person = { artistId: c.artistId, name: c.name, creditedAs: c.creditedAs, roles: [] };
    list.push(person);
  }
  const key = `${c.relationType}|${c.attributes.join(",")}`;
  if (!person.roles.some((r) => `${r.relationType}|${r.attributes.join(",")}` === key)) {
    person.roles.push({ relationType: c.relationType, attributes: c.attributes });
  }
}

/**
 * Autoría del álbum por persona (openspec: add-songwriter-credits, D5): cada autora o autor
 * una vez, con sus roles y las pistas cuyas obras firmó ("all" si firmó todas). Mismo orden
 * que los niveles de personal: más participación primero, luego por nombre. Pura.
 */
export function songwriterEntries(
  rows: SongwriterCreditInput[],
  albumTracks: { recordingId: string; discNumber: number; position: number }[],
): SongwriterEntry[] {
  const trackByRecording = new Map(albumTracks.map((t) => [t.recordingId, t]));
  const byArtist = new Map<string, { entry: SongwriterEntry; tracks: Map<string, PersonnelTrackRef> }>();
  for (const row of rows) {
    const t = trackByRecording.get(row.recordingId);
    if (!t) continue;
    let item = byArtist.get(row.artistId);
    if (!item) {
      item = { entry: { artistId: row.artistId, name: row.name, creditedAs: row.creditedAs, roles: [], tracks: [] }, tracks: new Map() };
      byArtist.set(row.artistId, item);
    }
    const key = `${row.relationType}|${row.attributes.join(",")}`;
    if (!item.entry.roles.some((r) => `${r.relationType}|${r.attributes.join(",")}` === key)) {
      item.entry.roles.push({ relationType: row.relationType, attributes: row.attributes });
    }
    item.tracks.set(t.recordingId, { recordingId: t.recordingId, discNumber: t.discNumber, position: t.position });
  }

  const entries = [...byArtist.values()].map(({ entry, tracks }) => ({
    ...entry,
    tracks:
      albumTracks.length > 0 && tracks.size === albumTracks.length
        ? ("all" as const)
        : [...tracks.values()].sort((a, b) => a.discNumber - b.discNumber || a.position - b.position),
  }));
  const weight = (e: SongwriterEntry) => (e.tracks === "all" ? Number.MAX_SAFE_INTEGER : e.tracks.length);
  return entries.sort((a, b) => weight(b) - weight(a) || a.name.localeCompare(b.name) || a.artistId.localeCompare(b.artistId));
}

/**
 * Créditos agrupados por pista (openspec: album-credits-by-song, D4): por cada grabación del
 * álbum, las personas con sus roles en esa pista, en Producción / Intérpretes / Sonido /
 * Otros. Una persona con roles de varios grupos aparece en cada grupo con los roles que le
 * tocan. Los créditos de nivel edición van a `albumWide`. Pura y determinista.
 */
export function groupCreditsByTrack(
  credits: PersonnelCreditInput[],
  albumTracks: { recordingId: string }[],
  songwriters: SongwriterCreditInput[] = [],
): CreditsByTrack {
  const albumRecordings = new Set(albumTracks.map((t) => t.recordingId));
  const albumWide = emptyGroups();
  const tracks: Record<string, TrackCreditGroups> = {};

  for (const c of credits) {
    let groups: TrackCreditGroups;
    if (c.recordingId === null) groups = albumWide;
    else if (albumRecordings.has(c.recordingId)) groups = tracks[c.recordingId] ??= emptyGroups();
    else continue;

    addRole(groups[trackCreditKind(c.relationType)], c);
  }
  // Autoría de la obra de cada pista: siempre en el grupo `songwriting`.
  for (const s of songwriters) {
    if (!albumRecordings.has(s.recordingId)) continue;
    addRole((tracks[s.recordingId] ??= emptyGroups()).songwriting, s);
  }

  const byName = (a: TrackCreditPerson, b: TrackCreditPerson) => a.name.localeCompare(b.name) || a.artistId.localeCompare(b.artistId);
  for (const groups of [albumWide, ...Object.values(tracks)]) {
    for (const kind of Object.keys(groups) as TrackCreditKind[]) groups[kind].sort(byName);
  }
  return { albumWide, tracks };
}

/** Autoría de las obras de un conjunto de grabaciones, en una consulta. */
function loadSongwriterRows(recordingIds: string[]): Promise<SongwriterCreditInput[]> {
  if (recordingIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      recordingId: recordingWork.recordingId,
      artistId: workCredit.artistId,
      name: artist.name,
      creditedAs: workCredit.creditedAs,
      relationType: workCredit.relationType,
      attributes: workCredit.attributes,
    })
    .from(workCredit)
    .innerJoin(recordingWork, eq(recordingWork.workId, workCredit.workId))
    .innerJoin(artist, eq(artist.id, workCredit.artistId))
    .where(inArray(recordingWork.recordingId, recordingIds));
}

/**
 * Autores de la obra (u obras) de una grabación, para la línea "Escrita por" de la página de
 * canción (openspec: add-songwriter-credits, D5). Una consulta; sin requests a MusicBrainz.
 * Cada persona una vez, con sus roles; ordenados como los entrega la base (por nombre).
 */
export async function getRecordingSongwriters(recordingId: string): Promise<TrackCreditPerson[]> {
  const rows = await loadSongwriterRows([recordingId]);
  const people: TrackCreditPerson[] = [];
  for (const row of rows) addRole(people, row);
  return people.sort((a, b) => a.name.localeCompare(b.name) || a.artistId.localeCompare(b.artistId));
}

/**
 * Créditos de personal del álbum (edición representativa y sus grabaciones) clasificados
 * en niveles, más la autoría de las obras de sus pistas. `null` si el álbum no tiene ni
 * créditos de personal ni de autoría (la pestaña no se muestra).
 */
export async function getAlbumPersonnel(releaseGroupId: string): Promise<AlbumPersonnel | null> {
  const [representative] = await db
    .select({ id: release.id, mbid: release.mbid })
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  if (!representative) return null;

  const albumTracks = await db
    .select({ recordingId: track.recordingId, discNumber: track.discNumber, position: track.position })
    .from(track)
    .where(eq(track.releaseId, representative.id));
  const recordingIds = albumTracks.map((t) => t.recordingId);

  const [creditRows, primaryRows, songwriterRows] = await Promise.all([
    db
      .select({
        artistId: personnelCredit.artistId,
        name: artist.name,
        creditedAs: personnelCredit.creditedAs,
        relationType: personnelCredit.relationType,
        attributes: personnelCredit.attributes,
        recordingId: personnelCredit.recordingId,
      })
      .from(personnelCredit)
      .innerJoin(artist, eq(artist.id, personnelCredit.artistId))
      .where(
        recordingIds.length
          ? or(eq(personnelCredit.releaseId, representative.id), inArray(personnelCredit.recordingId, recordingIds))
          : eq(personnelCredit.releaseId, representative.id),
      ),
    db
      .select({ id: artist.id, type: artist.type })
      .from(credit)
      .innerJoin(artist, eq(artist.id, credit.artistId))
      .where(and(eq(credit.releaseGroupId, releaseGroupId), eq(credit.role, "primary"), isNull(credit.recordingId))),
    loadSongwriterRows(recordingIds),
  ]);
  // Sin personal ni autoría no hay pestaña Créditos.
  if (creditRows.length === 0 && songwriterRows.length === 0) return null;

  const primaryIds = primaryRows.map((row) => row.id);
  const memberRows = primaryIds.length
    ? await db.select({ personId: membership.personId }).from(membership).where(inArray(membership.groupId, primaryIds))
    : [];
  const memberIds = new Set([
    ...memberRows.map((row) => row.personId),
    // Un solista acreditado en su propio disco no es "invitado".
    ...primaryRows.filter((row) => row.type === "person").map((row) => row.id),
  ]);

  return {
    levels: classifyPersonnel(creditRows, albumTracks, memberIds),
    leadKind: leadKindOf(primaryRows.map((row) => row.type)),
    songwriters: songwriterEntries(songwriterRows, albumTracks),
    byTrack: groupCreditsByTrack(creditRows, albumTracks, songwriterRows),
    releaseMbid: representative.mbid,
  };
}
