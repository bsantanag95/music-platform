## ADDED Requirements

### Requirement: Discos del modal de inicio bajo demanda

La página de artista SHALL NOT enviar con la página la discografía que usa el modal de inicio del recorrido. Al pulsar
"Completar discografía", el panel SHALL pedir los discos con crédito principal del artista
(`GET /api/catalog/artist/{id}/journey-albums`) y abrir el modal con ellos; mientras llegan, la acción SHALL quedar
deshabilitada, y si la petición falla SHALL mostrarse el aviso "No pudimos cargar sus discos. Intenta de nuevo." sin
abrir el modal. El endpoint SHALL ser de lectura pública, SHALL leer la discografía guardada sin consultar MusicBrainz y
SHALL responder 404 `ARTIST_NOT_FOUND` para un id inválido o un artista inexistente.

#### Scenario: Abrir el modal

- **WHEN** un usuario sin recorrido de Pink Floyd pulsa "Completar discografía"
- **THEN** el panel pide los discos de Pink Floyd y abre el modal de inicio con ellos

#### Scenario: Página sin la discografía del modal

- **WHEN** un usuario con sesión abre la página de un artista
- **THEN** la respuesta no incluye la lista de discos del modal de inicio

#### Scenario: Fallo al pedir los discos

- **WHEN** la petición de los discos falla
- **THEN** el panel muestra "No pudimos cargar sus discos. Intenta de nuevo." y el modal no se abre
