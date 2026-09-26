## ADDED Requirements

### Requirement: Autoría en las filas del primer nivel

En la vista Por persona, la fila de cada persona del primer nivel (integrantes de la banda o
artista principal) que también tiene créditos de autoría en el disco SHALL mostrar una
línea secundaria con sus roles de autoría (con las mismas etiquetas que la sección
Composición) y las pistas cuyas obras firmó, con el mismo formato compacto de pistas. Una
persona del primer nivel sin autoría SHALL NOT mostrar esa línea. La sección Composición
SHALL seguir listando a todas las personas autoras, integrantes incluidos.

#### Scenario: Integrante que compuso

- **WHEN** Nikki Sixx es integrante y tiene `composer` y `lyricist` en todas las obras
- **THEN** su fila de integrante muestra una línea "música, letra · todas" además de sus
  roles de intérprete

#### Scenario: Integrante sin autoría

- **WHEN** un integrante no firmó ninguna obra del disco
- **THEN** su fila no muestra línea de autoría

### Requirement: Resumen de Composición con integrantes

Cuando al menos una persona autora pertenece al primer nivel y el artista principal es un
grupo, el resumen contraído de Composición SHALL indicar la cantidad total, cuántas de esas
personas son integrantes, y nombrar hasta tres autoras externas, con "y N más" para el
resto. Si todas las autoras son integrantes, el resumen SHALL indicar solo el total y que
son integrantes. En los demás casos SHALL usarse el resumen general de los niveles.

#### Scenario: Banda con un autor externo

- **WHEN** Composición tiene 5 personas y 4 son integrantes
- **THEN** el resumen dice "5 · 4 integrantes + Donna McDaniel"

#### Scenario: Toda la autoría es de la banda

- **WHEN** las 3 personas de Composición son integrantes
- **THEN** el resumen dice "3 · todas integrantes"

#### Scenario: Solista

- **WHEN** el artista principal es una persona
- **THEN** el resumen de Composición es el general: cantidad y tres primeros nombres

### Requirement: Roles en el resumen de niveles cortos

Cuando un nivel contraído de la vista Por persona tiene 3 personas o menos, su resumen
SHALL nombrar a cada persona con su primer rol entre paréntesis, en el orden del nivel, en
lugar de la cantidad y los nombres solos. El nivel SHALL seguir contraído y poder
desplegarse. Con más de 3 personas SHALL mantenerse el resumen de cantidad y tres nombres.
Esta regla SHALL aplicarse también a Arte y otros, y a Composición cuando no usa el resumen
con integrantes.

#### Scenario: Producción con tres personas

- **WHEN** Producción y sonido tiene a Bob Rock (producción, ingeniería), Chris Taylor
  (asistencia de ingeniería) y Randy Staub (ingeniería, mezcla)
- **THEN** el resumen dice "Bob Rock (producción) · Chris Taylor (asistencia de ingeniería)
  · Randy Staub (ingeniería)" y el nivel sigue contraído

#### Scenario: Nivel largo

- **WHEN** Músicos invitados tiene 18 personas
- **THEN** el resumen sigue siendo "18 · " con tres nombres y "y 15 más"

### Requirement: Atribución enlazada en Créditos

La nota de fuente de la pestaña Créditos SHALL enlazar a la página pública de la edición
representativa en MusicBrainz, abriéndose en una pestaña nueva y anunciándolo a lectores de
pantalla. Sin MBID de edición, la nota SHALL mostrarse sin enlace.

#### Scenario: Enlace a la edición

- **WHEN** una persona abre la pestaña Créditos de un álbum con edición representativa
- **THEN** "MusicBrainz" enlaza a `https://musicbrainz.org/release/<mbid>` de esa edición
  y se abre en una pestaña nueva
