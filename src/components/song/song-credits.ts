import type { PersonnelRole, TrackCreditPerson } from "@/services/catalog/personnel-levels";

// Orden de los créditos de la grabación en la página de canción (openspec:
// polish-song-credits-strip). Funciones puras: el componente solo pinta.

/** Integrantes de los artistas principales primero; después los invitados. Estable. */
export function splitMembers(
  people: TrackCreditPerson[],
  memberIds: Set<string>,
): { members: TrackCreditPerson[]; guests: TrackCreditPerson[] } {
  return {
    members: people.filter((person) => memberIds.has(person.artistId)),
    guests: people.filter((person) => !memberIds.has(person.artistId)),
  };
}

// Jerarquía de Sonido: quien mezcló antes que quien grabó, y los asistentes al final.
const SOUND_RANK: Record<string, number> = {
  mix: 0,
  mastering: 1,
  recording: 2,
  engineer: 3,
  audio: 4,
  sound: 4,
  balance: 4,
  programming: 5,
  editor: 6,
};
const OTHER_RANK = 7;

const isAssistantRole = (role: PersonnelRole) => role.attributes.includes("assistant");

/** ¿Todos sus roles son de asistencia? */
export function isAssistant(person: TrackCreditPerson): boolean {
  return person.roles.length > 0 && person.roles.every(isAssistantRole);
}

function soundRank(person: TrackCreditPerson): number {
  const main = person.roles.filter((role) => !isAssistantRole(role));
  return Math.min(...main.map((role) => SOUND_RANK[role.relationType] ?? OTHER_RANK), OTHER_RANK);
}

/**
 * Sonido por jerarquía: por el rol principal de cada persona (mezcla, masterización, grabación,
 * ingeniería, programación, otros) y, a igual rango, por nombre; quienes solo asisten, aparte.
 */
export function orderSound(people: TrackCreditPerson[]): { main: TrackCreditPerson[]; assistants: TrackCreditPerson[] } {
  const byName = (a: TrackCreditPerson, b: TrackCreditPerson) => a.name.localeCompare(b.name);
  const main = people.filter((person) => !isAssistant(person));
  return {
    main: [...main].sort((a, b) => soundRank(a) - soundRank(b) || byName(a, b)),
    assistants: people.filter(isAssistant).sort(byName),
  };
}
