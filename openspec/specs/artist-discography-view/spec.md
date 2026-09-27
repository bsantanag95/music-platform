# artist-discography-view Specification

## Purpose
Presentar la discografía propia del artista por secciones, en grilla o tabla, con la sección en la URL, las marcas del usuario, "Mejor valorado" y la franja "También en" para las bandas de una persona.
## Requirements
### Requirement: Secciones de la discografía

La pestaña Discografía SHALL mostrar un selector de secciones con Principal, En vivo,
Recopilatorios, Sencillos, Otros y Apariciones, en ese orden, cada una con su cantidad de
discos, según la clasificación de la capability `artist-discography`. Una sección sin discos
SHALL omitirse. Principal SHALL ser la sección activa por defecto; si está vacía, SHALL
activarse la primera sección con discos. Dentro de cada sección los discos SHALL ordenarse
por año ascendente, con los discos sin año al final en orden estable por título. La
discografía SHALL mostrar solo discos del propio artista (y sus apariciones), nunca los de
las bandas de las que es integrante.

#### Scenario: Banda con muchos discos

- **WHEN** una persona abre Pink Floyd
- **THEN** ve "Principal 19", "En vivo 95", "Recopilatorios 40", "Sencillos 48", "Otros 16"
  y "Apariciones 1", con Principal activa

#### Scenario: Artista con pocas secciones

- **WHEN** un artista solo tiene discos en Principal, En vivo, Recopilatorios y Sencillos
- **THEN** el selector no muestra Otros ni Apariciones

#### Scenario: Sin discos principales

- **WHEN** un artista solo tiene sencillos y apariciones
- **THEN** la sección activa al llegar es Sencillos

### Requirement: Sección en la URL

La sección activa SHALL reflejarse en la URL con el parámetro `section` y los valores `main`,
`live`, `compilations`, `singles`, `other` y `appearances`. Abrir la URL con una sección
SHALL mostrarla activa; un valor desconocido o una sección vacía SHALL tratarse como la
sección por defecto.

#### Scenario: Enlace a los discos en vivo

- **WHEN** una persona abre `/{locale}/artist/{id}?section=live`
- **THEN** la discografía se muestra con En vivo activa

### Requirement: Vistas grilla y tabla

Cada sección SHALL poder verse como grilla de carátulas o como tabla. La vista por defecto
SHALL ser grilla en Principal y tabla en las demás secciones. Un selector de vista SHALL
permitir cambiarla, y la elección SHALL recordarse por sección en el navegador del visitante;
si el almacenamiento del navegador no está disponible, SHALL usarse la vista por defecto sin
error.

#### Scenario: Vistas por defecto

- **WHEN** una persona abre por primera vez un artista y pasa de Principal a En vivo
- **THEN** Principal se muestra en grilla y En vivo en tabla

#### Scenario: Elección recordada

- **WHEN** una persona cambia Principal a tabla y vuelve a la página otro día
- **THEN** Principal se muestra en tabla

### Requirement: Contenido de la grilla

Cada tarjeta de la grilla SHALL mostrar la carátula, el título y el año, una etiqueta "EP" en
los EP de Principal, y las marcas personales del usuario en sesión: escuchado (✓) y sus
estrellas si lo valoró. La grilla SHALL mostrar como máximo 48 discos y una acción "Mostrar
más" que agrega los siguientes 48.

#### Scenario: EP en Principal

- **WHEN** Principal incluye un EP
- **THEN** su tarjeta lleva la etiqueta "EP"

#### Scenario: Artista con cientos de discos principales

- **WHEN** Principal tiene 300 discos
- **THEN** la grilla muestra los primeros 48 y "Mostrar más"

### Requirement: Contenido de la tabla

Cada fila de la tabla SHALL mostrar el año, una miniatura de la carátula, el título, el tipo
(etiqueta con los tipos de MusicBrainz traducidos, por ejemplo "en vivo", "banda sonora",
"remix"), la valoración media de la comunidad con su cantidad de valoraciones cuando hay al
menos 5 ("< 5 notas" en otro caso) y la columna "Tú" con las marcas personales. En
Apariciones, la fila SHALL indicar el artista principal del disco. En móvil, la tabla SHALL
reducirse a año, título y "Tú", con el tipo y la valoración de la comunidad en una segunda
línea bajo el título, sin desbordamiento horizontal.

#### Scenario: Disco con pocas valoraciones

- **WHEN** un disco en vivo tiene 3 valoraciones
- **THEN** su fila muestra "< 5 notas" en la columna de comunidad

#### Scenario: Aparición

- **WHEN** el artista figura como invitado en un sencillo de otro artista
- **THEN** la fila en Apariciones indica ese artista principal

### Requirement: Mejor valorado

En la sección Principal, el disco con mayor valoración media de la comunidad entre los que
tienen al menos 5 valoraciones SHALL llevar la marca "Mejor valorado", y en caso de empate,
el que tiene más valoraciones. Si ningún disco llega a 5 valoraciones, ningún disco SHALL
llevar la marca.

#### Scenario: Disco destacado

- **WHEN** *The Dark Side of the Moon* tiene la media más alta entre los discos principales
  con al menos 5 valoraciones
- **THEN** su tarjeta lleva "Mejor valorado"

#### Scenario: Pocas valoraciones

- **WHEN** ningún disco principal tiene 5 valoraciones
- **THEN** ninguna tarjeta lleva la marca

### Requirement: También en

En la página de una persona que es integrante de grupos, la pestaña Discografía SHALL
mostrar, debajo de la discografía propia, una franja "También en" con una tarjeta por grupo:
foto, nombre, período de pertenencia y cantidad de discos principales del grupo cuando su
discografía ya está sincronizada, con enlace a la página del grupo. Construir la franja SHALL
NOT sincronizar la discografía de ningún grupo.

#### Scenario: Solista con banda

- **WHEN** una persona abre a un solista que fue integrante de Pink Floyd de 1965 a 1985
- **THEN** ve la tarjeta "Pink Floyd · 1965 – 1985 · 12 discos principales" enlazada a la
  página de la banda, y los discos de Pink Floyd no aparecen en su discografía

#### Scenario: Grupo sin discografía sincronizada

- **WHEN** el grupo de una persona nunca tuvo su discografía sincronizada
- **THEN** su tarjeta se muestra sin cantidad de discos y la página no consulta MusicBrainz
  por ese grupo

