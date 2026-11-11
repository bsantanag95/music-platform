## MODIFIED Requirements

### Requirement: Browse de eventos por el único cliente

Los eventos de un artista SHALL pedirse a MusicBrainz solo por `src/services/musicbrainz/client.ts`, con
`/event?artist={mbid}&inc=place-rels+area-rels+artist-rels+series-rels+event-rels`, de a 100 y por la cola de ≥1,1 s
del cliente. Las giras y los festivales SHALL salir de esa misma request, sin requests extra.

#### Scenario: Browse paginado

- **WHEN** se sincronizan los conciertos de un artista con 371 eventos
- **THEN** se hacen 4 requests por la cola del cliente

## ADDED Requirements

### Requirement: Giras y festivales de MusicBrainz

La sincronización SHALL guardar la gira de cada evento (la primera relación `part of` con una serie de tipo `Tour`, por
su orden) y enlazarla; SHALL guardar el fin del rango de fechas de un festival; y, para un evento con la relación `parts`
hacia un evento de tipo `Festival`, SHALL guardar ese festival como concierto de MusicBrainz (nombre y rango de fechas,
sin cartel) si no existe y enlazar el evento a él. Un festival que ya existe SHALL NOT perder sus datos: solo SHALL
completarse su fin si faltaba. Las demás relaciones entre eventos SHALL ignorarse.

#### Scenario: Día de un festival

- **WHEN** se importa "Glastonbury Festival 2019, Friday: Pyramid Stage", parte de "Glastonbury Festival 2019"
- **THEN** existe el festival del 26 al 30 de junio de 2019 y el día está enlazado a él

#### Scenario: Reprogramado

- **WHEN** un concierto tiene la relación `rescheduled as` con otro
- **THEN** no se crea ningún festival ni enlace
