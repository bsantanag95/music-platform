// Línea de tiempo de la alineación (openspec: modernize-artist-page-phase2, capability `artist-lineup-view`): una fila por
// integrante actual y antiguo con un tramo por período de cada rol, sobre un eje de años. Función pura: no inventa fechas —
// sin año de inicio el tramo arranca en la formación (`openStart`), terminado sin año de fin dura un año marcado como
// desconocido (`openEnd`) y un período sin ningún año no se dibuja.

export interface TimelinePeriod {
  beginDate: string | null;
  endDate: string | null;
  ended: boolean;
}

export interface TimelineMember {
  artistId: string;
  name: string;
  lines: { instruments: string[]; periods: TimelinePeriod[] }[];
}

export interface TimelineGroup {
  /** Fecha de formación con su precisión (`1975`, `1975-12`, …). */
  lifeBegin: string | null;
  lifeEnd: string | null;
  lifeEnded: boolean | null;
}

export type SegmentKind = "voice" | "instrument";

export interface TimelineSegment {
  from: number;
  to: number;
  kind: SegmentKind;
  openStart: boolean;
  openEnd: boolean;
}

export interface TimelineRow {
  artistId: string;
  name: string;
  current: boolean;
  segments: TimelineSegment[];
}

export interface LineupTimelineData {
  from: number;
  to: number;
  /** El grupo sigue activo: el eje termina en «hoy». */
  present: boolean;
  ticks: number[];
  rows: TimelineRow[];
}

/** Mínimo de integrantes con fechas para que la línea de tiempo aporte algo. */
export const TIMELINE_MIN_ROWS = 2;

export function yearOfDate(date: string | null): number | null {
  if (!date || !/^\d{4}/.test(date)) return null;
  return Number(date.slice(0, 4));
}

/** Una voz de MusicBrainz: `vocals`, `lead vocals`, `backing vocals`, … */
export function isVoice(instrument: string): boolean {
  return /vocal/i.test(instrument);
}

/**
 * Tramos que dibuja una línea de roles: el instrumento si tiene alguno que no sea voz (o ninguno), y la voz encima si la tiene.
 * Así el bajista que hace coros sigue leyéndose como bajista.
 */
export function lineKinds(instruments: string[]): SegmentKind[] {
  const voice = instruments.some(isVoice);
  const instrument = instruments.length === 0 || instruments.some((item) => !isVoice(item));
  return [...(instrument ? (["instrument"] as const) : []), ...(voice ? (["voice"] as const) : [])];
}

function segmentsOf(member: TimelineMember, groupBegin: number | null, openEndYear: number): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  for (const line of member.lines) {
    const kinds = lineKinds(line.instruments);
    for (const period of line.periods) {
      const begin = yearOfDate(period.beginDate);
      const end = yearOfDate(period.endDate);
      if (begin === null && end === null) continue;
      const from = begin ?? (groupBegin !== null && end !== null ? Math.min(groupBegin, end) : end!);
      let to: number;
      let openEnd = false;
      if (end !== null) to = end;
      else if (period.ended) {
        to = from + 1;
        openEnd = true;
      } else to = Math.max(openEndYear, from);
      for (const kind of kinds) segments.push({ from, to: Math.max(to, from), kind, openStart: begin === null, openEnd });
    }
  }
  return segments;
}

function ticksFor(from: number, to: number): number[] {
  const ticks = [from];
  for (let year = Math.floor(from / 10) * 10 + 10; year <= to - 4; year += 10) {
    if (year - from >= 4) ticks.push(year);
  }
  return ticks;
}

export function lineupTimeline(
  lineup: { current: TimelineMember[]; past: TimelineMember[] },
  group: TimelineGroup,
  nowYear: number,
): LineupTimelineData | null {
  const groupBegin = yearOfDate(group.lifeBegin);
  const ended = group.lifeEnded === true;
  const groupEnd = ended ? yearOfDate(group.lifeEnd) : null;
  const openEndYear = groupEnd ?? nowYear;

  const build = (members: TimelineMember[], current: boolean): TimelineRow[] =>
    members
      .map((member) => ({ artistId: member.artistId, name: member.name, current, segments: segmentsOf(member, groupBegin, openEndYear) }))
      .filter((row) => row.segments.length > 0);

  const firstYear = (row: TimelineRow) => Math.min(...row.segments.map((segment) => segment.from));
  const past = build(lineup.past, false).sort((a, b) => firstYear(a) - firstYear(b));
  const rows = [...build(lineup.current, true), ...past];
  if (rows.length < TIMELINE_MIN_ROWS) return null;

  const all = rows.flatMap((row) => row.segments);
  const from = Math.min(groupBegin ?? Infinity, ...all.map((segment) => segment.from));
  const lastSegment = Math.max(...all.map((segment) => segment.to));
  const to = Math.max(ended ? (groupEnd ?? lastSegment) : nowYear, lastSegment, from + 1);
  return { from, to, present: !ended, ticks: ticksFor(from, to), rows };
}
