## MODIFIED Requirements

### Requirement: Presupuesto de MusicBrainz por tipo

Cada búsqueda SHALL limitar sus solicitudes a MusicBrainz según el tipo: **Artistas**, una
búsqueda de artistas; **Álbumes**, una búsqueda de release-groups; **Usuarios**, ninguna;
**Canciones**, una búsqueda de artistas para detectar la interpretación, como máximo un browse de
discografía por interpretación probada (solo si no hay créditos locales), como máximo dos
búsquedas de recordings (una por interpretación) y como máximo cuatro browse de apariciones del
primer grupo. En **Canciones con `purpose=pick`** SHALL NOT hacerse ningún browse de apariciones.
"Cargar más" SHALL costar una solicitud. Todas las búsquedas SHALL compartir la caché TTL del
cliente de MusicBrainz.

#### Scenario: Buscar un artista
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas con la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz

#### Scenario: Consulta repetida
- **WHEN** la misma búsqueda de álbumes se repite dentro de la TTL
- **THEN** no se emite ninguna solicitud a MusicBrainz

#### Scenario: Canciones en modo de elección
- **WHEN** se busca `megadeth rust in peace` en Canciones con `purpose=pick` y la caché fría
- **THEN** no se emite ningún browse de apariciones (`/release?recording=`) y el total de solicitudes a
  MusicBrainz es como mucho cuatro (artistas, un browse de discografía, dos búsquedas de recordings)

## ADDED Requirements

### Requirement: Modo de elección en Canciones

`GET /api/catalog/search?type=song` SHALL aceptar el parámetro opcional `purpose`. Con `purpose=pick` (usado
por los buscadores que eligen un objetivo, como el diálogo de acciones rápidas), la búsqueda de Canciones SHALL
seguir la misma detección de interpretación, filtro de relevancia, agrupación por (canción, artista) y orden que
sin el parámetro, pero:

- SHALL NOT browséar apariciones; todos los grupos SHALL devolver `albums: []`;
- **cada** grupo devuelto SHALL tener grabación identidad (`recordingId` y `mbid` no nulos): la contribución
  local con más apariciones si el grupo tiene alguna; si no, la primera grabación de MusicBrainz del grupo en
  orden de score que no tenga `disambiguation` (versión de estudio) y, si todas la tienen, la primera;
- las grabaciones identidad que no existan en la base SHALL registrarse con sus créditos a partir de los datos
  de la búsqueda de recordings, sin solicitudes adicionales a MusicBrainz;
- la respuesta SHALL incluir como máximo 10 grupos, sin `nextOffset`.

Sin `purpose`, o con otro valor, el comportamiento SHALL ser el descrito en "Resolución de canciones hacia
álbumes que las contienen". El parámetro SHALL ignorarse en Artistas y Álbumes.

#### Scenario: Varias canciones elegibles

- **WHEN** se busca `megadeth` en Canciones con `purpose=pick` y MusicBrainz devuelve grabaciones de cinco
  canciones distintas de Megadeth
- **THEN** la respuesta tiene cinco grupos, todos con `recordingId` no nulo y `albums: []`

#### Scenario: Prefiere la versión de estudio

- **WHEN** un grupo tiene, en orden de score, una grabación con `disambiguation` "live" y luego una sin
  `disambiguation`
- **THEN** la identidad del grupo es la grabación sin `disambiguation`

#### Scenario: Prefiere la grabación local

- **WHEN** un grupo tiene una grabación local con apariciones ingeridas
- **THEN** su identidad es esa grabación local y no se registra ninguna grabación nueva para el grupo

#### Scenario: Sin purpose no cambia /search

- **WHEN** se busca `megadeth` en Canciones sin `purpose`
- **THEN** solo el primer grupo tiene `recordingId` y sus álbumes, como antes

### Requirement: Cancelación de búsquedas abandonadas

Cuando quien hizo una solicitud a `GET /api/catalog/search` la abandona (la conexión se aborta), el servidor
SHALL dejar de emitir las solicitudes a MusicBrainz de esa búsqueda que aún esperan turno en la cola de rate
limit, y SHALL NOT encolar nuevas. Una solicitud a MusicBrainz ya en curso SHALL completarse. Una solicitud en
espera compartida por varias búsquedas idénticas (la misma clave de la caché TTL) SHALL descartarse solo cuando
**todas** las búsquedas que la esperan fueron abandonadas. Una solicitud descartada SHALL NOT quedar en la
caché TTL. Las escrituras que dependan de una solicitud descartada (stubs, grabaciones) SHALL NOT hacerse.

#### Scenario: Escritura rápida

- **WHEN** el diálogo pide `megadeth` y la aborta mientras su búsqueda de recordings espera turno en la cola
- **THEN** esa búsqueda de recordings nunca se envía a MusicBrainz y la búsqueda siguiente no espera por ella

#### Scenario: Búsqueda compartida

- **WHEN** dos personas buscan `slayer` en Álbumes a la vez y una de ellas abandona su solicitud
- **THEN** la solicitud a MusicBrainz se emite igual y la otra persona recibe sus resultados

#### Scenario: Solicitud descartada no se cachea

- **WHEN** una búsqueda se descartó por abandono y otra persona busca lo mismo después
- **THEN** la nueva búsqueda emite la solicitud a MusicBrainz en vez de recibir el error de cancelación
