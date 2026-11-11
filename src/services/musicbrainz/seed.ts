// Enlace al formulario de alta de eventos de MusicBrainz, precargado (openspec: add-shared-concerts-phase3, capability
// `community-concerts`, ADR 0059). No es una request del servidor: es un enlace que la persona abre y completa con su
// cuenta (el recinto y los artistas se agregan allá como relaciones). Los nombres de los campos salen del formulario
// `MusicBrainz::Server::Form::Event` (`name`, `type_id`, `period.begin_date.*`, `period.end_date.*`, `period.ended`) y
// del rol `EditNote` (`edit_note`), con el prefijo `edit-event.` ("Development/Seeding"). El campo `setlist` de
// MusicBrainz es texto con su propia sintaxis, no un enlace: el setlist.fm va como fuente en la nota de edición.

const EVENT_CREATE_URL = "https://musicbrainz.org/event/create";
/** `event_type.id` de "Concert" en MusicBrainz. */
const CONCERT_TYPE_ID = "1";

export interface EventSeed {
  name: string;
  /** `YYYY-MM-DD`. */
  eventDate: string;
  setlistfmUrl?: string | null;
}

/** URL de `/event/create` con nombre, tipo concierto, fecha de un día (terminado) y la nota de edición. */
export function musicbrainzEventCreateUrl(seed: EventSeed): string {
  const [year, month, day] = seed.eventDate.split("-").map((part) => String(Number(part)));
  const params = new URLSearchParams({ "edit-event.name": seed.name, "edit-event.type_id": CONCERT_TYPE_ID });
  for (const edge of ["begin_date", "end_date"] as const) {
    params.set(`edit-event.period.${edge}.year`, year!);
    params.set(`edit-event.period.${edge}.month`, month!);
    params.set(`edit-event.period.${edge}.day`, day!);
  }
  params.set("edit-event.period.ended", "1");
  if (seed.setlistfmUrl) params.set("edit-event.edit_note", `Setlist: ${seed.setlistfmUrl}`);
  return `${EVENT_CREATE_URL}?${params.toString()}`;
}
