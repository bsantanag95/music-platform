## ADDED Requirements

### Requirement: Ingesta de autoría de obras en la request existente

Al ingerir la tracklist de una edición, el sistema SHALL pedir en la **misma** request a
MusicBrainz las obras (*works*) vinculadas a cada grabación y las relaciones de artista de
esas obras (`work-rels` + `work-level-rels`), sin requests adicionales por canción ni por
obra. SHALL guardar cada obra una sola vez por su MBID con su título, el vínculo de cada
grabación con su obra o sus obras (con los atributos del vínculo, como `cover`, `live`,
`instrumental`, `medley`, `partial`), y cada relación de artista de la obra como crédito de
autoría: artista, tipo de relación tal como lo entrega MusicBrainz (`writer`, `composer`,
`lyricist`, `librettist`, `arranger`, `translator`, …), atributos en orden estable y nombre
acreditado cuando difiere. El sistema SHALL guardar todos los tipos con destino artista y
SHALL ignorar las relaciones con otros destinos (por ejemplo, editoriales). Los artistas no
conocidos SHALL crearse como stub. Los créditos de autoría de obra SHALL guardarse aparte de
los créditos de personal y de los de autoría visible (`primary`/`featured`), y SHALL NOT
modificarlos. La ingesta SHALL ser idempotente y el reemplazo SHALL ser transaccional.

#### Scenario: Sin requests adicionales

- **WHEN** se ingiere una edición de 12 pistas
- **THEN** el sistema hace una sola request de edición a MusicBrainz, que trae tracklist,
  créditos de personal, obras y sus autores

#### Scenario: Canción con tres autores

- **WHEN** la grabación de "Eyes Wide Open" está vinculada a una obra con relaciones
  `writer` de Jerrod Bettis, Meghan Kabir y Audra Mae
- **THEN** se guardan la obra, su vínculo con la grabación y tres créditos de autoría de tipo
  `writer`

#### Scenario: Obra compartida entre grabaciones

- **WHEN** una versión en vivo y la versión de estudio de una canción están vinculadas a la
  misma obra
- **THEN** la obra y sus autores se guardan una sola vez y ambas grabaciones la referencian

#### Scenario: Obra sin autores cargados

- **WHEN** una grabación está vinculada a una obra sin relaciones de artista
- **THEN** se guardan la obra y el vínculo, sin créditos de autoría, y la ingesta no falla

#### Scenario: Editorial

- **WHEN** una obra tiene una relación `publishing` con un sello
- **THEN** esa relación no se guarda como crédito de autoría

#### Scenario: Reingesta

- **WHEN** se ingieren dos veces las obras de la misma edición sin cambios en MusicBrainz
- **THEN** no se duplican obras, vínculos ni créditos de autoría

### Requirement: Sincronización de autoría de álbumes existentes

Una edición representativa SHALL marcar por separado si su autoría de obras está
sincronizada. Para un álbum cuya edición representativa tiene la autoría o los créditos de
personal pendientes, el sistema SHALL sincronizar ambos con la misma request, fuera del
camino de la respuesta al visitar la página, con el lock por edición existente, y SHALL
marcar cada uno como sincronizado solo al terminar correctamente. El script de backfill de
créditos de personal SHALL incluir las ediciones con la autoría pendiente, con `--dry-run`
y `--limit`.

#### Scenario: Álbum ingerido antes de este cambio

- **WHEN** una persona visita un álbum con créditos de personal sincronizados y autoría
  pendiente
- **THEN** la página responde normalmente y después se sincroniza la autoría con una request

#### Scenario: Fallo de la sincronización

- **WHEN** la sincronización falla a mitad del reemplazo
- **THEN** la transacción se revierte, el álbum conserva los datos previos y queda pendiente

### Requirement: Lectura de autoría del álbum

La lectura de créditos de un álbum SHALL incluir la autoría de las obras de las pistas de
su edición representativa: por persona (una vez, con sus roles de autoría y las pistas cuyas
obras firmó, o "todas") y por pista (las personas con sus roles en la obra de esa pista).
La autoría SHALL ser un eje independiente de los niveles de personal: una persona puede
figurar en la autoría y además en un nivel de personal. La lectura SHALL existir cuando el
álbum tiene créditos de personal o de autoría, y SHALL ser nula solo si no tiene ninguno.

#### Scenario: Autora que también produce

- **WHEN** Mitch Allan firma la obra de la pista 1 y además tiene créditos `producer` e
  `instrument` en esa grabación
- **THEN** figura en la autoría con la pista 1 y también en Producción y sonido

#### Scenario: Álbum solo con autoría

- **WHEN** un álbum no tiene créditos de personal pero sus obras tienen autores
- **THEN** la lectura existe e incluye la autoría
