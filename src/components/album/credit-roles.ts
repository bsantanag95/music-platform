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

/**
 * Roles legibles de una persona, sin repetir: los instrumentos y la voz se muestran por
 * sus atributos ("guitarra", "voz principal"); el resto por su tipo, con sus matices entre
 * paréntesis ("ingeniería (asistente)").
 */
export function formatRoles(roles: PersonnelRole[], label: Translate): string[] {
  const out: string[] = [];
  const add = (value: string) => {
    if (!out.includes(value)) out.push(value);
  };
  for (const role of roles) {
    if ((role.relationType === "instrument" || role.relationType === "vocal") && role.attributes.length > 0) {
      for (const attribute of role.attributes) add(label("attributes", attribute));
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
