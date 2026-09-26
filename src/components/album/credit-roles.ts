import type { PersonnelRole } from "@/services/catalog/personnel-levels";

// Etiquetas de roles e instrumentos de los créditos de personal (openspec:
// redesign-album-page, tarea 8.2). Lista cerrada en i18n con fallback al texto de
// MusicBrainz: un rol o instrumento sin traducción se muestra tal cual, nunca se pierde.

/** Clave de mensaje para un tipo de relación o atributo ("design/illustration" → "design_illustration"). */
export function messageKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type Translate = (kind: "roles" | "attributes", raw: string) => string;
/** Etiqueta compuesta de tipo + modificador ("producer" + "co" → "coproducción"), o `null`. */
type Compound = (relationType: string, modifier: string) => string | null;

// Atributos de MusicBrainz que matizan un rol en vez de nombrar un instrumento (openspec:
// compact-album-credits, D4). En instrumentos y voces, "additional" y "guest" se omiten (el
// nivel ya dice si es invitado) y "solo" se muestra como matiz.
const MODIFIERS = new Set(["additional", "guest", "solo", "co", "executive", "assistant"]);
const DROPPED_PERFORMER_MODIFIERS = new Set(["additional", "guest"]);

// Peso de un rol de intérprete (openspec: polish-album-credits, D1): lo que define a la
// persona primero. 0 voz principal, 1 instrumento (por defecto), 2 voces de apoyo, 3
// percusión menor. A igual peso se conserva el orden de MusicBrainz.
const SUPPORT_VOCALS = new Set(["background vocals", "choir vocals", "other vocals"]);
const MINOR_PERCUSSION = new Set([
  "percussion",
  "membranophone",
  "idiophone",
  "tambourine",
  "shakers",
  "handclaps",
  "bell",
  "congas",
  "timbales",
  "whistling",
]);

function performerWeight(relationType: string, attribute: string | null): number {
  if (attribute === null) return relationType === "vocal" ? 0 : 1;
  const value = attribute.toLowerCase();
  if (value === "lead vocals") return 0;
  if (SUPPORT_VOCALS.has(value)) return 2;
  if (MINOR_PERCUSSION.has(value)) return 3;
  return 1;
}

/**
 * Roles legibles de una persona, sin repetir: los instrumentos y la voz se muestran por
 * sus atributos ("guitarra", "voz principal"); el resto por su tipo, con una etiqueta
 * compuesta si existe ("coproducción") o sus matices entre paréntesis
 * ("programación (percusión)"). Los roles de intérprete se reordenan por peso en las
 * posiciones que ocupan; los demás no se mueven.
 */
export function formatRoles(roles: PersonnelRole[], label: Translate, compound: Compound = () => null): string[] {
  // `weight` null = rol que no es de intérprete: conserva su posición.
  const out: { value: string; weight: number | null }[] = [];
  const add = (value: string, weight: number | null = null) => {
    if (!out.some((item) => item.value === value)) out.push({ value, weight });
  };
  for (const role of roles) {
    const modifiers = role.attributes.filter((a) => MODIFIERS.has(a));
    const rest = role.attributes.filter((a) => !MODIFIERS.has(a));

    if (role.relationType === "instrument" || role.relationType === "vocal") {
      const shades = modifiers.filter((m) => !DROPPED_PERFORMER_MODIFIERS.has(m)).map((m) => label("attributes", m));
      const withShades = (base: string) => (shades.length > 0 ? `${base} (${shades.join(", ")})` : base);
      if (rest.length === 0) add(withShades(label("roles", role.relationType)), performerWeight(role.relationType, null));
      for (const attribute of rest) {
        add(withShades(label("attributes", attribute)), performerWeight(role.relationType, attribute));
      }
      continue;
    }

    const combined = modifiers.length === 1 && rest.length === 0 ? compound(role.relationType, modifiers[0]!) : null;
    if (combined) {
      add(combined);
      continue;
    }
    const base = label("roles", role.relationType);
    add(role.attributes.length > 0 ? `${base} (${role.attributes.map((a) => label("attributes", a)).join(", ")})` : base);
  }

  const slots = out.flatMap((item, index) => (item.weight === null ? [] : [index]));
  const performers = slots.map((index) => out[index]!).sort((a, b) => a.weight! - b.weight!);
  slots.forEach((slot, i) => {
    out[slot] = performers[i]!;
  });
  return out.map((item) => item.value);
}

export interface TrackPosition {
  discNumber: number;
  position: number;
}

/** Tramo de una línea de pistas: una pista suelta o un rango de 3+ consecutivas del mismo disco. */
export type TrackSegment<T extends TrackPosition> = { kind: "single"; track: T } | { kind: "range"; from: T; to: T };

/** `except` lleva las pistas faltantes, tomadas de la edición. */
export type CompactTracks<T extends TrackPosition, E extends TrackPosition = T> =
  | { kind: "list"; segments: TrackSegment<T>[] }
  | { kind: "except"; tracks: E[] };

/** Menor cantidad de pistas de la edición para decir "todas salvo…". */
export const EXCEPT_MIN_TOTAL = 5;
/** Máximo de pistas excluidas en "todas salvo…". */
export const EXCEPT_MAX_MISSING = 2;
const RANGE_MIN = 3;

const sameTrack = (a: TrackPosition, b: TrackPosition) => a.discNumber === b.discNumber && a.position === b.position;
const byPosition = (a: TrackPosition, b: TrackPosition) => a.discNumber - b.discNumber || a.position - b.position;

/**
 * Línea de pistas compacta (openspec: polish-album-credits, D2). Con la edición completa
 * (`edition`, al menos `EXCEPT_MIN_TOTAL` pistas) y a lo sumo `EXCEPT_MAX_MISSING` pistas
 * faltantes, devuelve las excluidas ("todas salvo la 1"); si no, agrupa en rangos las
 * corridas de 3 o más pistas consecutivas del mismo disco. Pura.
 */
export function compactTracks<T extends TrackPosition, E extends TrackPosition>(
  tracks: T[],
  edition: E[] = [],
): CompactTracks<T, E> {
  const sorted = [...tracks].sort(byPosition);
  if (edition.length >= EXCEPT_MIN_TOTAL && sorted.every((t) => edition.some((e) => sameTrack(e, t)))) {
    const missing = edition.filter((e) => !sorted.some((t) => sameTrack(e, t))).sort(byPosition);
    if (missing.length > 0 && missing.length <= EXCEPT_MAX_MISSING) return { kind: "except", tracks: missing };
  }

  const segments: TrackSegment<T>[] = [];
  let run: T[] = [];
  const flush = () => {
    if (run.length >= RANGE_MIN) segments.push({ kind: "range", from: run[0]!, to: run[run.length - 1]! });
    else for (const track of run) segments.push({ kind: "single", track });
    run = [];
  };
  for (const track of sorted) {
    const last = run[run.length - 1];
    if (last && (last.discNumber !== track.discNumber || track.position !== last.position + 1)) flush();
    run.push(track);
  }
  flush();
  return { kind: "list", segments };
}

/** Posiciones de pistas: "3" en un disco, "2-1" cuando el álbum tiene varios discos. */
export function formatTrackList(tracks: { discNumber: number; position: number }[], multiDisc: boolean): string {
  return tracks.map((t) => (multiDisc ? `${t.discNumber}-${t.position}` : String(t.position))).join(", ");
}
