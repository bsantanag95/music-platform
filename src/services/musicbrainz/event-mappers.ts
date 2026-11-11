// Normalización de los eventos de MusicBrainz a conciertos compartidos (openspec: add-shared-concerts-phase1, capability
// `musicbrainz-event-sync`, ADR 0057). Funciones puras: la escritura vive en src/services/concerts/concert-sync.ts.
//
// Reglas: solo `Concert` y `Festival` con fecha completa; el recinto sale de la relación `held at` con un `place`, la
// ciudad del área de ese `place` y el país solo cuando el área es un país (la ciudad llega sin país: D4). Los cancelados
// se devuelven marcados (no se listan, pero se guardan para no reimportarlos como nuevos).

import type { MBEvent, MBEventArea } from "./types";

export type ConcertKind = "concert" | "festival";
export type PerformerRole = "main" | "support" | "guest";

export interface ConcertPerformerInput {
  artistMbid: string;
  artistName: string;
  role: PerformerRole;
  position: number;
}

export interface ConcertInput {
  mbid: string;
  name: string;
  kind: ConcertKind;
  eventDate: string; // 'YYYY-MM-DD'
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
    venue: clip(place?.name, 300),
    venueMbid: place?.id ?? null,
    city: area && area.type !== "Country" ? clip(area.name, 200) : null,
    areaMbid: area?.id ?? null,
    country: countryOf(area),
    cancelled: event.cancelled === true,
    performers,
  };
}
