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

/**
 * Roles legibles de una persona, sin repetir: los instrumentos y la voz se muestran por
 * sus atributos ("guitarra", "voz principal"); el resto por su tipo, con una etiqueta
 * compuesta si existe ("coproducción") o sus matices entre paréntesis
 * ("programación (percusión)").
 */
export function formatRoles(roles: PersonnelRole[], label: Translate, compound: Compound = () => null): string[] {
  const out: string[] = [];
  const add = (value: string) => {
    if (!out.includes(value)) out.push(value);
  };
  for (const role of roles) {
    const modifiers = role.attributes.filter((a) => MODIFIERS.has(a));
    const rest = role.attributes.filter((a) => !MODIFIERS.has(a));

    if (role.relationType === "instrument" || role.relationType === "vocal") {
      const shades = modifiers.filter((m) => !DROPPED_PERFORMER_MODIFIERS.has(m)).map((m) => label("attributes", m));
      const withShades = (base: string) => (shades.length > 0 ? `${base} (${shades.join(", ")})` : base);
      if (rest.length === 0) add(withShades(label("roles", role.relationType)));
      for (const attribute of rest) add(withShades(label("attributes", attribute)));
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
  return out;
}

/** Posiciones de pistas: "3" en un disco, "2-1" cuando el álbum tiene varios discos. */
export function formatTrackList(tracks: { discNumber: number; position: number }[], multiDisc: boolean): string {
  return tracks.map((t) => (multiDisc ? `${t.discNumber}-${t.position}` : String(t.position))).join(", ");
}
