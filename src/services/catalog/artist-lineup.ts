import { and, eq, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { artist, artistSupport, membership, membershipPeriod } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { discographySection } from "./discography-sections";
import { readArtistDiscography } from "./ingest-discography";
import {
  classifyLineup,
  instrumentLines,
  isCurrentAffiliation,
  isOpenPeriod,
  type ClassifiedPerson,
  type InstrumentLine,
  type LineupPeriodInput,
  type LineupPersonInput,
} from "./lineup-classify";

// Lectura de la alineación de un artista para la interfaz (openspec: add-artist-lineup-data,
// design D7). Solo lee PostgreSQL: nunca consulta MusicBrainz. Las otras afiliaciones de cada
// persona salen de su propia sincronización (design D6); mientras no se sincronizó, va sin
// ellas y cuenta como pendiente.

/** Otro artista de un integrante: un grupo suyo o un artista al que da apoyo. */
export interface LineupAffiliation {
  artistId: string;
  name: string;
  current: boolean;
  support: boolean;
}

export interface LineupMember extends ClassifiedPerson {
  affiliations: LineupAffiliation[];
  /** Su alineación nunca se sincronizó: todavía no se conocen sus otras afiliaciones. */
  pending: boolean;
}

export interface GroupLineup {
  kind: "group";
  lastLineup: boolean;
  current: LineupMember[];
  past: LineupMember[];
  supportCurrent: LineupMember[];
  supportPast: LineupMember[];
  pending: number;
}

export interface PersonGroupEntry {
  artistId: string;
  name: string;
  photoUrl: string | null;
  isFounder: boolean;
  current: boolean;
  lines: InstrumentLine[];
  groupBegin: string | null;
  groupEnd: string | null;
  groupEnded: boolean | null;
  /** Discos de Principal del grupo; `null` si su discografía nunca se sincronizó. */
  mainCount: number | null;
}

export interface SupportedArtistEntry {
  artistId: string;
  name: string;
  current: boolean;
  lines: InstrumentLine[];
}

export interface PersonLineup {
  kind: "person";
  groups: PersonGroupEntry[];
  supportFor: SupportedArtistEntry[];
  supportersCurrent: LineupMember[];
  supportersPast: LineupMember[];
  pending: number;
}

export type ArtistLineup = GroupLineup | PersonLineup;

interface PersonRow {
  id: string;
  name: string;
  mbid: string | null;
  lifeEnded: boolean | null;
  lifeEnd: string | null;
  lineupSyncedAt: Date | null;
}

const MARKS = new Set(["original", "additional"]);

/**
 * Período de una pertenencia sin períodos guardados (sincronizada antes de la migración 0055,
 * mientras su actualización está pendiente): se arma con el resumen de `membership`.
 */
function legacyPeriod(summary: {
  role: string | null;
  joinedOn: string | null;
  leftOn: string | null;
}): LineupPeriodInput {
  const attributes = summary.role ? summary.role.split(", ") : [];
  return {
    beginDate: summary.joinedOn,
    endDate: summary.leftOn,
    ended: summary.leftOn !== null,
    instruments: attributes.filter((attribute) => !MARKS.has(attribute)),
    isFounder: attributes.includes("original"),
    isAdditional: attributes.includes("additional"),
  };
}

const personColumns = {
  id: artist.id,
  name: artist.name,
  mbid: artist.mbid,
  lifeEnded: artist.lifeEnded,
  lifeEnd: artist.lifeEnd,
  lineupSyncedAt: artist.lineupSyncedAt,
};

const periodColumns = {
  periodId: membershipPeriod.id,
  beginDate: membershipPeriod.beginDate,
  endDate: membershipPeriod.endDate,
  ended: membershipPeriod.ended,
  instruments: membershipPeriod.instruments,
  isFounder: membershipPeriod.isFounder,
  isAdditional: membershipPeriod.isAdditional,
};

interface PeriodColumns {
  periodId: string | null;
  beginDate: string | null;
  endDate: string | null;
  ended: boolean | null;
  instruments: string[] | null;
  isFounder: boolean | null;
  isAdditional: boolean | null;
}

function periodOf(row: PeriodColumns): LineupPeriodInput | null {
  if (row.periodId === null) return null;
  return {
    beginDate: row.beginDate,
    endDate: row.endDate,
    ended: row.ended === true,
    instruments: row.instruments ?? [],
    isFounder: row.isFounder === true,
    isAdditional: row.isAdditional === true,
  };
}

/** Agrupa filas (una por período) en una entrada por persona. */
function collectPeople(
  rows: {
    person: PersonRow;
    period: LineupPeriodInput | null;
    legacy: LineupPeriodInput | null;
  }[],
): { inputs: LineupPersonInput[]; people: Map<string, PersonRow> } {
  const inputs = new Map<string, LineupPersonInput>();
  const people = new Map<string, PersonRow>();
  for (const { person, period, legacy } of rows) {
    people.set(person.id, person);
    const input = inputs.get(person.id) ?? {
      artistId: person.id,
      name: person.name,
      lifeEnded: person.lifeEnded,
      lifeEnd: person.lifeEnd,
      periods: [],
    };
    const value = period ?? legacy;
    if (value) input.periods.push(value);
    inputs.set(person.id, input);
  }
  return { inputs: [...inputs.values()], people };
}

/** Otras afiliaciones de un lote de personas, sin el artista que se está viendo. */
async function readAffiliations(
  people: Map<string, PersonRow>,
  excludeId: string,
): Promise<Map<string, LineupAffiliation[]>> {
  const synced = [...people.values()].filter((person) => person.lineupSyncedAt !== null).map((person) => person.id);
  const result = new Map<string, LineupAffiliation[]>();
  if (synced.length === 0) return result;

  const [membershipRows, supportRows] = await Promise.all([
    db
      .select({
        membershipId: membership.id,
        personId: membership.personId,
        otherId: artist.id,
        otherName: artist.name,
        otherLifeEnded: artist.lifeEnded,
        leftOn: membership.leftOn,
        periodId: membershipPeriod.id,
        endDate: membershipPeriod.endDate,
        ended: membershipPeriod.ended,
      })
      .from(membership)
      .innerJoin(artist, eq(artist.id, membership.groupId))
      .leftJoin(membershipPeriod, eq(membershipPeriod.membershipId, membership.id))
      .where(and(inArray(membership.personId, synced), ne(membership.groupId, excludeId))),
    db
      .select({
        personId: artistSupport.musicianId,
        otherId: artist.id,
        otherName: artist.name,
        otherLifeEnded: artist.lifeEnded,
        endDate: artistSupport.endDate,
        ended: artistSupport.ended,
      })
      .from(artistSupport)
      .innerJoin(artist, eq(artist.id, artistSupport.artistId))
      .where(and(inArray(artistSupport.musicianId, synced), ne(artistSupport.artistId, excludeId))),
  ]);

  type Pending = {
    name: string;
    lifeEnded: boolean | null;
    periods: { endDate: string | null; ended: boolean }[];
  };
  const collect = (
    map: Map<string, Map<string, Pending>>,
    personId: string,
    otherId: string,
    otherName: string,
    otherLifeEnded: boolean | null,
  ) => {
    const byOther = map.get(personId) ?? new Map<string, Pending>();
    map.set(personId, byOther);
    const entry = byOther.get(otherId) ?? {
      name: otherName,
      lifeEnded: otherLifeEnded,
      periods: [],
    };
    byOther.set(otherId, entry);
    return entry;
  };

  const groups = new Map<string, Map<string, Pending>>();
  for (const row of membershipRows) {
    const entry = collect(groups, row.personId, row.otherId, row.otherName, row.otherLifeEnded);
    entry.periods.push(
      row.periodId === null
        ? { endDate: row.leftOn, ended: row.leftOn !== null }
        : { endDate: row.endDate, ended: row.ended === true },
    );
  }
  const supports = new Map<string, Map<string, Pending>>();
  for (const row of supportRows) {
    collect(supports, row.personId, row.otherId, row.otherName, row.otherLifeEnded).periods.push({
      endDate: row.endDate,
      ended: row.ended,
    });
  }

  for (const personId of synced) {
    const personLifeEnded = people.get(personId)!.lifeEnded;
    const list = (map: Map<string, Map<string, Pending>>, support: boolean): LineupAffiliation[] =>
      [...(map.get(personId) ?? new Map<string, Pending>()).entries()].map(([artistId, entry]) => ({
        artistId,
        name: entry.name,
        support,
        current: isCurrentAffiliation(entry.periods, personLifeEnded, entry.lifeEnded),
      }));
    // Orden: grupos actuales, grupos antiguos ("ex-"), apoyo actual, apoyo anterior.
    const ordered = [...list(groups, false), ...list(supports, true)].sort(
      (a, b) =>
        Number(a.support) - Number(b.support) || Number(b.current) - Number(a.current) || a.name.localeCompare(b.name),
    );
    result.set(personId, ordered);
  }
  return result;
}

function withAffiliations(
  people: ClassifiedPerson[],
  rows: Map<string, PersonRow>,
  affiliations: Map<string, LineupAffiliation[]>,
): LineupMember[] {
  return people.map((person) => ({
    ...person,
    affiliations: affiliations.get(person.artistId) ?? [],
    pending: rows.get(person.artistId)?.lineupSyncedAt === null,
  }));
}

function countPending(people: Map<string, PersonRow>): number {
  return [...people.values()].filter((person) => person.mbid !== null && person.lineupSyncedAt === null).length;
}

async function readSupporters(artistId: string) {
  const musician = alias(artist, "musician");
  const rows = await db
    .select({
      person: {
        id: musician.id,
        name: musician.name,
        mbid: musician.mbid,
        lifeEnded: musician.lifeEnded,
        lifeEnd: musician.lifeEnd,
        lineupSyncedAt: musician.lineupSyncedAt,
      },
      beginDate: artistSupport.beginDate,
      endDate: artistSupport.endDate,
      ended: artistSupport.ended,
      instruments: artistSupport.instruments,
    })
    .from(artistSupport)
    .innerJoin(musician, eq(musician.id, artistSupport.musicianId))
    .where(eq(artistSupport.artistId, artistId));
  return collectPeople(rows.map(({ person, ...period }) => ({ person, period, legacy: null })));
}

async function readMembers(groupId: string) {
  const memberRows = await db
    .select({
      person: personColumns,
      role: membership.role,
      joinedOn: membership.joinedOn,
      leftOn: membership.leftOn,
      ...periodColumns,
    })
    .from(membership)
    .innerJoin(artist, eq(artist.id, membership.personId))
    .leftJoin(membershipPeriod, eq(membershipPeriod.membershipId, membership.id))
    .where(eq(membership.groupId, groupId));
  return collectPeople(
    memberRows.map((row) => ({
      person: row.person,
      period: periodOf(row),
      legacy: periodOf(row) ? null : legacyPeriod(row),
    })),
  );
}

async function readGroupLineup(group: {
  id: string;
  lifeEnded: boolean | null;
  lifeEnd: string | null;
}): Promise<GroupLineup> {
  const members = await readMembers(group.id);
  const supporters = await readSupporters(group.id);

  const everyone = new Map([...members.people, ...supporters.people]);
  const affiliations = await readAffiliations(everyone, group.id);
  const classified = classifyLineup(members.inputs, supporters.inputs, group);
  return {
    kind: "group",
    lastLineup: classified.lastLineup,
    current: withAffiliations(classified.current, everyone, affiliations),
    past: withAffiliations(classified.past, everyone, affiliations),
    supportCurrent: withAffiliations(classified.supportCurrent, everyone, affiliations),
    supportPast: withAffiliations(classified.supportPast, everyone, affiliations),
    pending: countPending(everyone),
  };
}

/** Discos de Principal de un grupo, o `null` si su discografía nunca se sincronizó. */
export async function mainDiscCount(groupId: string, discographySyncedAt: Date | null): Promise<number | null> {
  if (!discographySyncedAt) return null;
  const discography = await readArtistDiscography(groupId);
  return discography.filter(
    (rg) =>
      discographySection({
        primaryType: rg.primaryType,
        secondaryTypes: rg.secondaryTypes,
        category: rg.category as ReleaseGroupCategory,
        creditRole: rg.creditRole,
      }) === "main",
  ).length;
}

/** Actuales primero; dentro, por año de ingreso (sin año al final) y por nombre. */
function byCurrentThenYear(
  a: { firstYear: number | null; entry: { current: boolean; name: string } },
  b: { firstYear: number | null; entry: { current: boolean; name: string } },
): number {
  return (
    Number(b.entry.current) - Number(a.entry.current) ||
    (a.firstYear ?? 9999) - (b.firstYear ?? 9999) ||
    a.entry.name.localeCompare(b.entry.name)
  );
}

const firstYear = (periods: LineupPeriodInput[]): number | null => {
  const years = periods
    .map((p) => (p.beginDate ? Number(p.beginDate.slice(0, 4)) : null))
    .filter((y): y is number => y !== null);
  return years.length ? Math.min(...years) : null;
};

async function readPersonLineup(person: {
  id: string;
  lifeEnded: boolean | null;
  lifeEnd: string | null;
}): Promise<PersonLineup> {
  const groupRows = await db
    .select({
      group: {
        id: artist.id,
        name: artist.name,
        photoUrl: artist.photoUrl,
        photoBlockedAt: artist.photoBlockedAt,
        lifeBegin: artist.lifeBegin,
        lifeEnd: artist.lifeEnd,
        lifeEnded: artist.lifeEnded,
        discographySyncedAt: artist.discographySyncedAt,
      },
      role: membership.role,
      joinedOn: membership.joinedOn,
      leftOn: membership.leftOn,
      ...periodColumns,
    })
    .from(membership)
    .innerJoin(artist, eq(artist.id, membership.groupId))
    .leftJoin(membershipPeriod, eq(membershipPeriod.membershipId, membership.id))
    .where(eq(membership.personId, person.id));

  const byGroup = new Map<string, { group: (typeof groupRows)[number]["group"]; periods: LineupPeriodInput[] }>();
  for (const row of groupRows) {
    const entry = byGroup.get(row.group.id) ?? {
      group: row.group,
      periods: [],
    };
    entry.periods.push(periodOf(row) ?? legacyPeriod(row));
    byGroup.set(row.group.id, entry);
  }
  const groups = await Promise.all(
    [...byGroup.values()].map(async ({ group, periods }) => ({
      firstYear: firstYear(periods),
      entry: {
        artistId: group.id,
        name: group.name,
        photoUrl: group.photoBlockedAt ? null : group.photoUrl,
        isFounder: periods.some((p) => p.isFounder === true),
        current: isCurrentAffiliation(periods, person.lifeEnded, group.lifeEnded),
        lines: instrumentLines(periods),
        groupBegin: group.lifeBegin,
        groupEnd: group.lifeEnd,
        groupEnded: group.lifeEnded,
        mainCount: await mainDiscCount(group.id, group.discographySyncedAt),
      } satisfies PersonGroupEntry,
    })),
  );

  const supportRows = await db
    .select({
      artistId: artist.id,
      name: artist.name,
      lifeEnded: artist.lifeEnded,
      beginDate: artistSupport.beginDate,
      endDate: artistSupport.endDate,
      ended: artistSupport.ended,
      instruments: artistSupport.instruments,
    })
    .from(artistSupport)
    .innerJoin(artist, eq(artist.id, artistSupport.artistId))
    .where(eq(artistSupport.musicianId, person.id));
  const bySupported = new Map<string, { name: string; lifeEnded: boolean | null; periods: LineupPeriodInput[] }>();
  for (const row of supportRows) {
    const entry = bySupported.get(row.artistId) ?? {
      name: row.name,
      lifeEnded: row.lifeEnded,
      periods: [],
    };
    entry.periods.push({
      beginDate: row.beginDate,
      endDate: row.endDate,
      ended: row.ended,
      instruments: row.instruments,
    });
    bySupported.set(row.artistId, entry);
  }
  const supportFor = [...bySupported.entries()]
    .map(([artistId, entry]) => ({
      firstYear: firstYear(entry.periods),
      entry: {
        artistId,
        name: entry.name,
        current: person.lifeEnded !== true && entry.lifeEnded !== true && entry.periods.some(isOpenPeriod),
        lines: instrumentLines(entry.periods),
      } satisfies SupportedArtistEntry,
    }))
    .sort(byCurrentThenYear)
    .map(({ entry }) => entry);

  const supporters = await readSupporters(person.id);
  const affiliations = await readAffiliations(supporters.people, person.id);
  // Un solista fallecido ya no tiene músicos de apoyo actuales.
  const classified = classifyLineup([], supporters.inputs, {
    lifeEnded: person.lifeEnded,
    lifeEnd: person.lifeEnd,
  });

  return {
    kind: "person",
    groups: groups.sort(byCurrentThenYear).map(({ entry }) => entry),
    supportFor,
    supportersCurrent: withAffiliations(classified.supportCurrent, supporters.people, affiliations),
    supportersPast: withAffiliations(classified.supportPast, supporters.people, affiliations),
    pending: countPending(supporters.people),
  };
}

/** Alineación de un artista: la de un grupo, o los grupos y el apoyo de una persona. */
export async function getArtistLineup(artistId: string): Promise<ArtistLineup | null> {
  const [target] = await db
    .select({
      id: artist.id,
      type: artist.type,
      lifeEnded: artist.lifeEnded,
      lifeEnd: artist.lifeEnd,
    })
    .from(artist)
    .where(eq(artist.id, artistId))
    .limit(1);
  if (!target) return null;
  return target.type === "group" ? readGroupLineup(target) : readPersonLineup(target);
}

/**
 * Personas de la alineación en el orden en que conviene sincronizarlas (design D6): de un grupo,
 * actuales, antiguos y apoyo; de una persona, sus músicos de apoyo. Sin afiliaciones ni
 * discografías: es la lectura mínima para la sincronización en segundo plano.
 */
export async function lineupSyncOrder(artistId: string): Promise<string[]> {
  const [target] = await db
    .select({ id: artist.id, type: artist.type, lifeEnded: artist.lifeEnded, lifeEnd: artist.lifeEnd })
    .from(artist)
    .where(eq(artist.id, artistId))
    .limit(1);
  if (!target) return [];
  const members = target.type === "group" ? await readMembers(target.id) : { inputs: [] };
  const supporters = await readSupporters(target.id);
  const classified = classifyLineup(members.inputs, supporters.inputs, target);
  return [...classified.current, ...classified.past, ...classified.supportCurrent, ...classified.supportPast].map(
    (person) => person.artistId,
  );
}
