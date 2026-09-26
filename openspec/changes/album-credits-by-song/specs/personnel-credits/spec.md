## MODIFIED Requirements

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

## ADDED Requirements

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
