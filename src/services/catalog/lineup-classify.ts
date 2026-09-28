// Clasificación pura de la alineación de un artista (openspec: add-artist-lineup-data, design
// D5): actuales, antiguos, "Última alineación" de un grupo separado y músicos de apoyo actuales
// y anteriores, con el orden de la lista y las líneas de instrumentos por conjunto de períodos.
// Sin traducciones ni formato de años: eso es de la interfaz.

export interface LineupPeriodInput {
  beginDate: string | null;
  endDate: string | null;
  ended: boolean;
  instruments: string[];
  isFounder?: boolean;
  isAdditional?: boolean;
}

export interface LineupPersonInput {
  artistId: string;
  name: string;
  /** Ficha de la persona: terminó (murió) y fecha de muerte con su precisión. */
  lifeEnded: boolean | null;
  lifeEnd: string | null;
  periods: LineupPeriodInput[];
}

export interface LineupSpan {
  beginDate: string | null;
  endDate: string | null;
  ended: boolean;
}

/** Instrumentos que comparten exactamente los mismos períodos, con esos períodos en orden. */
export interface InstrumentLine {
  instruments: string[];
  periods: LineupSpan[];
}

export interface ClassifiedPerson {
  artistId: string;
  name: string;
  isFounder: boolean;
  isAdditional: boolean;
  deceased: boolean;
  deathYear: number | null;
  lines: InstrumentLine[];
}

export interface ClassifiedLineup {
  /** El grupo terminó: `current` es la "Última alineación". */
  lastLineup: boolean;
  current: ClassifiedPerson[];
  past: ClassifiedPerson[];
  supportCurrent: ClassifiedPerson[];
  supportPast: ClassifiedPerson[];
}

export interface LineupGroupInput {
  lifeEnded: boolean | null;
  lifeEnd: string | null;
}

const yearOf = (date: string | null): number | null => (date ? Number(date.slice(0, 4)) : null);

/** Un período sigue abierto: sin fin y sin la marca de terminado (sin fechas cuenta como abierto). */
export function isOpenPeriod(period: Pick<LineupPeriodInput, "endDate" | "ended">): boolean {
  return !period.ended && period.endDate === null;
}

/**
 * Períodos tal como se muestran: los de una persona fallecida no siguen abiertos (Randy
 * Castillo figura en Stone Fury sin fin), y en un grupo separado un período abierto termina con
 * el grupo (el año de fin del grupo, si se conoce; si no, fin desconocido).
 */
function effectivePeriods(person: LineupPersonInput, group: LineupGroupInput | null): LineupPeriodInput[] {
  const deceased = person.lifeEnded === true;
  const groupEnded = group?.lifeEnded === true;
  return person.periods.map((period) => {
    if (!isOpenPeriod(period)) return period;
    if (groupEnded) return { ...period, ended: true, endDate: group?.lifeEnd ?? null };
    if (deceased) return { ...period, ended: true };
    return period;
  });
}

function compareSpans(a: LineupSpan, b: LineupSpan): number {
  return (yearOf(a.beginDate) ?? 9999) - (yearOf(b.beginDate) ?? 9999) || (a.beginDate ?? "").localeCompare(b.beginDate ?? "");
}

/**
 * Agrupa los instrumentos de una persona por el conjunto de períodos en que aparecen (Tommy Lee:
 * batería en tres períodos; coros, teclados y piano en uno). Los períodos sin instrumentos forman
 * una línea sin instrumentos. Las líneas se ordenan por su primer período.
 */
export function instrumentLines(input: LineupPeriodInput[]): InstrumentLine[] {
  // MusicBrainz a veces carga una relación por instrumento con las mismas fechas (Los Bunkers:
  // guitarra y voz 1999–2014 en relaciones separadas): son un solo período.
  const bySpan = new Map<string, LineupPeriodInput>();
  for (const period of input) {
    const key = `${period.beginDate}|${period.endDate}|${period.ended}`;
    const existing = bySpan.get(key);
    bySpan.set(
      key,
      existing
        ? { ...existing, instruments: [...new Set([...existing.instruments, ...period.instruments])] }
        : { ...period, instruments: [...period.instruments] },
    );
  }
  const periods = [...bySpan.values()];
  const order = periods.map((period, index) => ({ period, index })).sort((a, b) => compareSpans(a.period, b.period));
  const rank = new Map(order.map((entry, position) => [entry.index, position]));
  const byInstrument = new Map<string, Set<number>>();
  const bare: number[] = [];
  periods.forEach((period, index) => {
    if (period.instruments.length === 0) bare.push(index);
    for (const instrument of period.instruments) {
      byInstrument.set(instrument, (byInstrument.get(instrument) ?? new Set()).add(index));
    }
  });
  const lines = new Map<string, { instruments: string[]; indexes: number[] }>();
  for (const [instrument, indexes] of byInstrument) {
    const sorted = [...indexes].sort((a, b) => rank.get(a)! - rank.get(b)!);
    const key = sorted.join(",");
    const line = lines.get(key) ?? { instruments: [], indexes: sorted };
    line.instruments.push(instrument);
    lines.set(key, line);
  }
  if (bare.length > 0) {
    const sorted = bare.sort((a, b) => rank.get(a)! - rank.get(b)!);
    lines.set(`bare:${sorted.join(",")}`, { instruments: [], indexes: sorted });
  }
  return [...lines.values()]
    .sort((a, b) => rank.get(a.indexes[0]!)! - rank.get(b.indexes[0]!)!)
    .map(({ instruments, indexes }) => ({
      instruments,
      periods: indexes.map((index) => {
        const { beginDate, endDate, ended } = periods[index]!;
        return { beginDate, endDate, ended };
      }),
    }));
}

function classifyPerson(person: LineupPersonInput, periods: LineupPeriodInput[]): ClassifiedPerson {
  const deceased = person.lifeEnded === true;
  return {
    artistId: person.artistId,
    name: person.name,
    isFounder: periods.some((period) => period.isFounder === true),
    isAdditional: periods.some((period) => period.isAdditional === true),
    deceased,
    deathYear: deceased ? yearOf(person.lifeEnd) : null,
    lines: instrumentLines(periods),
  };
}

/** Fundadores primero, luego por año del primer período (sin año al final), luego por nombre. */
export function compareLineupPeople(
  a: { person: ClassifiedPerson; firstYear: number | null },
  b: { person: ClassifiedPerson; firstYear: number | null },
): number {
  return (
    Number(b.person.isFounder) - Number(a.person.isFounder) ||
    (a.firstYear ?? 9999) - (b.firstYear ?? 9999) ||
    a.person.name.localeCompare(b.person.name)
  );
}

function sortPeople(entries: { person: ClassifiedPerson; periods: LineupPeriodInput[] }[]): ClassifiedPerson[] {
  return entries
    .map(({ person, periods }) => {
      const years = periods.map((period) => yearOf(period.beginDate)).filter((year): year is number => year !== null);
      return { person, firstYear: years.length ? Math.min(...years) : null };
    })
    .sort(compareLineupPeople)
    .map(({ person }) => person);
}

/**
 * Clasifica integrantes y músicos de apoyo de un grupo. Una persona es actual si tiene algún
 * período abierto (después de cerrar los de fallecidos); si el grupo terminó, forman la "Última
 * alineación" quienes tienen un período abierto en MusicBrainz o que termina en el año de fin del
 * grupo, y todo el apoyo es anterior.
 */
export function classifyLineup(
  members: LineupPersonInput[],
  supports: LineupPersonInput[],
  group: LineupGroupInput,
): ClassifiedLineup {
  const groupEnded = group.lifeEnded === true;
  const groupEndYear = yearOf(group.lifeEnd);
  const current: { person: ClassifiedPerson; periods: LineupPeriodInput[] }[] = [];
  const past: typeof current = [];

  for (const member of members) {
    const periods = effectivePeriods(member, group);
    const entry = { person: classifyPerson(member, periods), periods };
    const inCurrent = groupEnded
      ? member.periods.some(
          (period) =>
            (isOpenPeriod(period) && member.lifeEnded !== true) ||
            (groupEndYear !== null && yearOf(period.endDate) === groupEndYear),
        )
      : periods.some(isOpenPeriod);
    (inCurrent ? current : past).push(entry);
  }

  const supportCurrent: typeof current = [];
  const supportPast: typeof current = [];
  for (const supporter of supports) {
    const periods = effectivePeriods(supporter, group);
    const entry = { person: classifyPerson(supporter, periods), periods };
    (!groupEnded && periods.some(isOpenPeriod) ? supportCurrent : supportPast).push(entry);
  }

  return {
    lastLineup: groupEnded,
    current: sortPeople(current),
    past: sortPeople(past),
    supportCurrent: sortPeople(supportCurrent),
    supportPast: sortPeople(supportPast),
  };
}

/**
 * Una afiliación sigue vigente (sin "ex-" en las otras bandas de un integrante): la persona vive,
 * el otro artista no terminó y algún período sigue abierto.
 */
export function isCurrentAffiliation(
  periods: Pick<LineupPeriodInput, "endDate" | "ended">[],
  personLifeEnded: boolean | null,
  otherLifeEnded: boolean | null,
): boolean {
  return personLifeEnded !== true && otherLifeEnded !== true && periods.some(isOpenPeriod);
}
