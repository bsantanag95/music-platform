// Normalización de los eventos de MusicBrainz a conciertos compartidos (openspec: add-shared-concerts-phase1, capability
// `musicbrainz-event-sync`, ADR 0057). Funciones puras: la escritura vive en src/services/concerts/concert-sync.ts.
//
// Reglas: solo `Concert` y `Festival` con fecha completa; el recinto sale de la relación `held at` con un `place`, la
// ciudad del área de ese `place` y el país solo cuando el área es un país (la ciudad llega sin país: D4). Los cancelados
// se devuelven marcados (no se listan, pero se guardan para no reimportarlos como nuevos).
// Fase 3 (add-shared-concerts-phase3, ADR 0059): la gira (primera serie de tipo `Tour`), el festival del que el evento es
// un día o un escenario (relación `parts` hacia atrás con un `Festival`) y el fin del rango de fechas de un festival. Las
// demás relaciones entre eventos (`rescheduled as`…) se ignoran.

import type { MBEvent, MBEventArea, MBEventRelation } from "./types";

export type ConcertKind = "concert" | "festival";
export type PerformerRole = "main" | "support" | "guest";

export interface ConcertPerformerInput {
  artistMbid: string;
  artistName: string;
  role: PerformerRole;
  position: number;
}

export interface ConcertTourInput {
  mbid: string;
  name: string;
}

/** Festival padre tal como lo trae la relación: sin recinto ni cartel. */
export interface ConcertParentInput {
  mbid: string;
  name: string;
  eventDate: string; // 'YYYY-MM-DD'
  endDate: string | null;
  cancelled: boolean;
}

export interface ConcertInput {
  mbid: string;
  name: string;
  kind: ConcertKind;
  eventDate: string; // 'YYYY-MM-DD'
  /** Fin de un rango de varios días (festival); `null` si es de un día. */
  endDate: string | null;
  tour: ConcertTourInput | null;
  parent: ConcertParentInput | null;
  venue: string | null;
  venueMbid: string | null;
  city: string | null;
  areaMbid: string | null;
  country: string | null;
  cancelled: boolean;
  performers: ConcertPerformerInput[];
}

const KINDS: Record<string, ConcertKind> = { Concert: "concert", Festival: "festival" };

const ROLES: Record<string, PerformerRole> = {
  "main performer": "main",
  "support act": "support",
  "guest performer": "guest",
};

/** Orden de los roles en el cartel: principales, luego teloneros e invitados. */
const ROLE_ORDER: Record<PerformerRole, number> = { main: 0, support: 1, guest: 2 };

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Topes de la base (`chk_concert_*`): un texto más largo se recorta en vez de perder el concierto. */
function clip(value: string | null | undefined, max: number): string | null {
  const text = value?.trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

/** Código ISO del área solo si es un país; una ciudad o región no lo tiene. */
function countryOf(area: MBEventArea | null | undefined): string | null {
  if (!area || area.type !== "Country") return null;
  const code = area["iso-3166-1-codes"]?.[0];
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Fin de un rango solo si es una fecha completa posterior al inicio (un día no tiene fin propio). */
function endOf(begin: string, end: string | null | undefined): string | null {
  return end && FULL_DATE.test(end) && end > begin ? end : null;
}

/** La gira: la primera relación `part of` con una serie de tipo `Tour`. */
function tourOf(relations: MBEventRelation[]): ConcertTourInput | null {
  const series = relations.find(
    (r) => r["target-type"] === "series" && r.type === "part of" && r.series && r.series.type === "Tour",
  )?.series;
  const name = clip(series?.name, 300);
  return series && name ? { mbid: series.id, name } : null;
}

/** El festival del que el evento es parte: `parts` hacia atrás con un `Festival` de fecha completa. */
function parentOf(relations: MBEventRelation[], ownMbid: string): ConcertParentInput | null {
  const parent = relations.find(
    (r) =>
      r["target-type"] === "event" &&
      r.type === "parts" &&
      r.direction === "backward" &&
      r.event?.type === "Festival" &&
      r.event.id !== ownMbid,
  )?.event;
  const begin = parent?.["life-span"]?.begin ?? "";
  const name = clip(parent?.name, 300);
  if (!parent || !name || !FULL_DATE.test(begin)) return null;
  return { mbid: parent.id, name, eventDate: begin, endDate: endOf(begin, parent["life-span"]?.end), cancelled: parent.cancelled === true };
}

/** Concierto compartido a partir de un evento de MusicBrainz, o `null` si no se importa. */
export function mapEventToConcert(event: MBEvent): ConcertInput | null {
  const kind = event.type ? KINDS[event.type] : undefined;
  if (!kind) return null;
  const date = event["life-span"]?.begin ?? "";
  if (!FULL_DATE.test(date)) return null;
  const name = clip(event.name, 300);
  if (!name) return null;

  const relations = event.relations ?? [];
  const place = relations.find((r) => r["target-type"] === "place" && r.type === "held at" && r.place)?.place ?? null;
  const directArea = relations.find((r) => r["target-type"] === "area" && r.area)?.area ?? null;
  const area = place?.area ?? directArea;

  const performers: ConcertPerformerInput[] = [];
  const seen = new Set<string>();
  for (const relation of relations) {
    if (relation["target-type"] !== "artist" || !relation.artist || !relation.type) continue;
    const role = ROLES[relation.type];
    const artistName = clip(relation.artist.name, 500);
    if (!role || !artistName) continue;
    const key = `${relation.artist.id}|${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    performers.push({ artistMbid: relation.artist.id, artistName, role, position: 0 });
  }
  // Orden estable: por rol y después como llegan de MusicBrainz.
  performers
    .map((performer, index) => ({ performer, index }))
    .sort((a, b) => ROLE_ORDER[a.performer.role] - ROLE_ORDER[b.performer.role] || a.index - b.index)
    .forEach(({ performer }, position) => (performer.position = position));
  performers.sort((a, b) => a.position - b.position);

  return {
    mbid: event.id,
    name,
    kind,
    eventDate: date,
    endDate: endOf(date, event["life-span"]?.end),
    tour: tourOf(relations),
    parent: parentOf(relations, event.id),
    venue: clip(place?.name, 300),
    venueMbid: place?.id ?? null,
    city: area && area.type !== "Country" ? clip(area.name, 200) : null,
    areaMbid: area?.id ?? null,
    country: countryOf(area),
    cancelled: event.cancelled === true,
    performers,
  };
}
