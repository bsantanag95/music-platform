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
pistas en que participa, o la indicación de que participa en todas. La lectura SHALL NOT
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

