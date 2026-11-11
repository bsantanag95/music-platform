# musicbrainz-event-sync Specification

## Purpose
Traer bajo demanda los eventos de MusicBrainz de un artista (conciertos y festivales con fecha completa) como conciertos compartidos confirmados, por el único cliente de MusicBrainz, con refresco periódico y sin crear artistas.
## Requirements
### Requirement: Browse de eventos por el único cliente

Los eventos de un artista SHALL pedirse a MusicBrainz solo por `src/services/musicbrainz/client.ts`, con
`/event?artist={mbid}&inc=place-rels+area-rels+artist-rels`, de a 100 y por la cola de ≥1,1 s del cliente.

#### Scenario: Browse paginado

- **WHEN** se sincronizan los conciertos de un artista con 371 eventos
- **THEN** se hacen 4 requests por la cola del cliente

### Requirement: Qué eventos se importan

La sincronización SHALL importar solo eventos de tipo `Concert` o `Festival` con fecha completa (`YYYY-MM-DD`). Los
cancelados SHALL guardarse marcados y no listarse. El recinto SHALL salir de la relación `held at` con un `place` (nombre
y `mbid`) y la ciudad del área de ese `place`; el país, del código ISO solo cuando el área es un país. Cada relación de
artista (`main performer`, `support act`, `guest performer`) SHALL guardarse con su rol, `mbid` y nombre, enlazada al
artista del catálogo solo si ya existe: la sincronización SHALL NOT crear artistas.

#### Scenario: Entrega de premios

- **WHEN** un artista tiene "2021 Billboard Music Awards" (tipo `Award ceremony`)
- **THEN** no se importa

#### Scenario: Fecha parcial

- **WHEN** un evento tiene solo `1972-11`
- **THEN** no se importa

#### Scenario: Teloneros sin catálogo

- **WHEN** un festival trae un telonero que no está en el catálogo
- **THEN** queda en el cartel con su nombre y su `mbid`, sin crear el artista

#### Scenario: Artista que entra después al catálogo

- **WHEN** un artista del cartel se agrega al catálogo más tarde
- **THEN** la siguiente sincronización que lo toque enlaza su fila del cartel por `mbid`

### Requirement: Sincronización bajo demanda y refresco

Al abrir la pestaña Conciertos de un artista nunca sincronizado, el sistema SHALL importar la primera página antes de
responder y el resto en segundo plano, hasta 1.000 eventos. Con más de 30 días desde el último recorrido completo SHALL
refrescar en segundo plano mostrando lo guardado. El recorrido completo SHALL marcar `artist.concerts_synced_at`; uno
interrumpido SHALL NOT marcarlo. La importación SHALL ser idempotente por `mbid` y SHALL NOT borrar un concierto que
desaparezca de MusicBrainz. Un fallo de MusicBrainz SHALL NOT romper la pestaña.

#### Scenario: Primera visita

- **WHEN** alguien abre por primera vez la pestaña Conciertos de Iron Maiden
- **THEN** ve los conciertos de la primera página y el resto se importa sin hacerle esperar

#### Scenario: Segunda importación

- **WHEN** se vuelve a sincronizar el mismo artista sin cambios en MusicBrainz
- **THEN** no se crean conciertos nuevos

#### Scenario: MusicBrainz caído

- **WHEN** MusicBrainz responde 503 en la primera visita
- **THEN** la pestaña muestra el estado vacío y la próxima visita reintenta

