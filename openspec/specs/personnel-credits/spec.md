# personnel-credits Specification

## Purpose
Ingerir y clasificar los créditos de personal de la edición representativa (integrantes, invitados, producción y otros) para mostrarlos en la página del álbum.
## Requirements
### Requirement: Ingesta de créditos de personal en la request existente

Al ingerir la tracklist de una edición, el sistema SHALL pedir en la misma request a
MusicBrainz las relaciones de artista de la edición y de sus grabaciones, y SHALL guardar
cada relación con destino artista como crédito de personal: artista, destino (la edición o
la grabación, exactamente uno), tipo de relación tal como lo entrega MusicBrainz,
atributos (instrumentos y matices) en orden estable y nombre acreditado cuando difiere del
nombre del artista. El sistema SHALL guardar **todos** los tipos de relación, sin
descartar ninguno. Los artistas no conocidos SHALL crearse como stub. Los créditos de
personal SHALL guardarse aparte de los créditos de autoría (`primary`/`featured`) y SHALL
NOT modificarlos. La ingesta SHALL ser idempotente.

#### Scenario: Sin requests adicionales

- **WHEN** se ingiere la tracklist de una edición
- **THEN** el sistema hace una sola request de edición a MusicBrainz, que trae tracklist,
  créditos de autoría y créditos de personal

#### Scenario: Músico con varios instrumentos en una pista

- **WHEN** una grabación tiene una relación `instrument` de Nick Mason con atributos
  `percussion` y `tape`
- **THEN** se guarda un crédito de personal de Nick Mason sobre esa grabación con tipo
  `instrument` y atributos `percussion`, `tape`

#### Scenario: Crédito de nivel edición

- **WHEN** la edición tiene una relación `design/illustration` con un artista
- **THEN** se guarda un crédito de personal sobre la edición, no sobre sus grabaciones

#### Scenario: Tipo desconocido

- **WHEN** MusicBrainz entrega un tipo de relación que el sistema no clasifica
- **THEN** el crédito se guarda igual con su tipo original

#### Scenario: Reingesta

- **WHEN** se ingieren dos veces los créditos de la misma edición sin cambios en
  MusicBrainz
- **THEN** no se duplican créditos de personal

### Requirement: Clasificación de créditos en niveles

El sistema SHALL ofrecer una lectura de los créditos de personal de un álbum (los de su
edición representativa y los de las grabaciones de su tracklist) agrupada por persona y
clasificada en cuatro niveles, con una tabla fija de tipos de relación en código:
**Integrantes de la banda** (cualquier crédito de una persona que es miembro de algún
artista principal del álbum, o que es ella misma un artista principal del álbum), **Músicos invitados** (tipos de intérprete de no miembros),
**Producción y sonido** (tipos de producción, ingeniería, mezcla y masterización) y **Arte
y otros** (todos los demás, incluidos los tipos desconocidos). Cada persona SHALL aparecer
una sola vez, en el nivel más alto que le corresponde, con todos sus roles y la lista de
pistas en que participa, o la indicación de que participa en todas. Para quien no es
integrante, un crédito de tipo `producer` (con o sin matiz: co, adicional, ejecutiva) SHALL
ubicarlo en **Producción y sonido** aunque también tenga créditos de intérprete: producir
pesa más que tocar. Dentro de cada persona, los roles SHALL ordenarse empezando por los
del tipo que define su nivel (producción primero en Producción y sonido, interpretación
primero en Músicos invitados). La lectura SHALL NOT
incluir personas sin crédito de personal en el álbum.

#### Scenario: Integrante con rol de producción

- **WHEN** un miembro de la banda tiene créditos `instrument` en todas las pistas y un
  crédito `producer`
- **THEN** aparece solo en Integrantes de la banda, con sus instrumentos y producción, y
  la indicación "todas"

#### Scenario: Invitada en una pista

- **WHEN** una vocalista que no es miembro tiene un crédito `vocal` solo en la pista 5
- **THEN** aparece en Músicos invitados con voz en la pista 5

#### Scenario: Ingeniero

- **WHEN** un artista tiene solo créditos `engineer`
- **THEN** aparece en Producción y sonido

#### Scenario: Miembro sin créditos

- **WHEN** una persona es miembro de la banda pero no tiene créditos de personal en el
  álbum
- **THEN** no aparece en la lectura

#### Scenario: Álbum de solista

- **WHEN** el artista principal es una persona acreditada con voz en su propio álbum
- **THEN** aparece en el primer nivel, no como músico invitado, y los demás créditos se
  clasifican normalmente

#### Scenario: Productor que también toca

- **WHEN** una persona que no es miembro tiene créditos `instrument` (órgano, piano) y
  `producer` en la pista 8
- **THEN** aparece en Producción y sonido con "producción" antes que sus instrumentos, y no
  en Músicos invitados

#### Scenario: Programación sin producción

- **WHEN** una persona que no es miembro tiene créditos `instrument` y `programming`, sin
  `producer`
- **THEN** aparece en Músicos invitados

### Requirement: Pertenencias necesarias para clasificar

Antes de marcar como sincronizados los créditos de personal de un álbum, el sistema SHALL
asegurar que las pertenencias (`membership`) de sus artistas principales estén
sincronizadas, de modo que un integrante no se clasifique como invitado por falta de datos.

#### Scenario: Banda sin pertenencias sincronizadas

- **WHEN** se sincronizan los créditos de un álbum cuya banda nunca sincronizó sus
  pertenencias
- **THEN** el sistema sincroniza también las pertenencias de la banda y los integrantes se
  clasifican como tales

### Requirement: Sincronización de créditos de álbumes existentes

Para un álbum cuya edición representativa tiene los créditos de personal pendientes, el
sistema SHALL sincronizarlos fuera del camino de la respuesta al visitar la página, con un
lock por edición, reemplazando en una transacción los créditos de personal de la edición y
de sus grabaciones, y marcando la edición como sincronizada solo al terminar
correctamente. Un fallo SHALL NOT afectar la respuesta. El sistema SHALL ofrecer un script
de backfill con `--dry-run` y `--limit`.

#### Scenario: Primera visita tras el despliegue

- **WHEN** una persona visita un álbum ingerido antes de este cambio
- **THEN** la página responde normalmente y los créditos de personal se sincronizan
  después

#### Scenario: Fallo a mitad de la sincronización

- **WHEN** la sincronización falla después de borrar créditos anteriores
- **THEN** la transacción se revierte y el álbum conserva los créditos previos y queda
  pendiente

### Requirement: Tipo de artista principal en la lectura

La lectura de créditos de personal de un álbum SHALL informar, junto con los niveles, si
el artista principal es una persona (`person`: todos los artistas principales del álbum son
personas) o un grupo (`group`: cualquier otro caso, incluidas colaboraciones mixtas y tipos
desconocidos), para rotular el primer nivel.

#### Scenario: Solista

- **WHEN** el único artista principal del álbum es de tipo persona
- **THEN** la lectura informa `person`

#### Scenario: Colaboración entre una solista y una banda

- **WHEN** el álbum tiene como artistas principales a una persona y a un grupo
- **THEN** la lectura informa `group`

### Requirement: Créditos agrupados por canción

La lectura de créditos de personal de un álbum SHALL ofrecer, además de la vista por
persona, los créditos agrupados por pista de la edición representativa: para cada pista,
las personas acreditadas en su grabación con los roles que tienen en esa pista, agrupadas
en Producción (tipo `producer`), Intérpretes (tipos de intérprete), Sonido (el resto de los
tipos de producción e ingeniería) y Otros; y aparte, los créditos de nivel edición, que
aplican a todo el álbum. La agrupación SHALL calcularse con las mismas filas de la lectura
por persona, sin consultas adicionales por pista.

#### Scenario: Pista con productor y músicos

- **WHEN** la pista 8 tiene un crédito `producer` de Jon Levine y un crédito `instrument`
  (ukelele) de Jon Sosin
- **THEN** la pista 8 lista a Jon Levine en Producción y a Jon Sosin en Intérpretes con
  ukelele

#### Scenario: Crédito de nivel edición

- **WHEN** una persona tiene un crédito `mastering` sobre la edición y no sobre pistas
- **THEN** aparece en los créditos de todo el álbum y en ninguna pista concreta

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

