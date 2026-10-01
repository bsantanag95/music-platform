# artist-discography-view Specification

## Purpose
Presentar la discografía propia del artista por secciones, en grilla o tabla, con la sección en la URL, las marcas del usuario y "Mejor valorado"; las bandas de una persona están en su pestaña Bandas.
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
los EP de Principal, el botón de acciones del disco (capability `discography-quick-actions`) y,
para el usuario en sesión, una franja de marcas sobre la base de la carátula con su nota ("★ 4½")
o ✓ si solo lo escuchó, ♥ si es favorito y el marcador si está en Pendiente; sin marcas, la
franja SHALL omitirse. Cada marca SHALL tener un texto accesible. La grilla SHALL mostrar como
máximo 48 discos y una acción "Mostrar más" que agrega los siguientes 48.

#### Scenario: EP en Principal

- **WHEN** Principal incluye un EP
- **THEN** su tarjeta lleva la etiqueta "EP"

#### Scenario: Artista con cientos de discos principales

- **WHEN** Principal tiene 300 discos
- **THEN** la grilla muestra los primeros 48 y "Mostrar más"

#### Scenario: Disco calificado y favorito

- **WHEN** una persona calificó *Dr. Feelgood* con 4½ estrellas y lo tiene como favorito
- **THEN** la carátula muestra "★ 4½" y el corazón

#### Scenario: Disco escuchado sin calificar

- **WHEN** una persona escuchó un disco y no lo calificó
- **THEN** la carátula muestra ✓

### Requirement: Contenido de la tabla

Cada fila de la tabla SHALL mostrar el año, una miniatura de la carátula, el título con una
etiqueta de tipo al lado solo cuando algún tipo del disco no es "álbum" (tipos de MusicBrainz
traducidos, por ejemplo "EP", "en vivo", "banda sonora", "remix"), la columna **"Media"** con la
valoración media de la comunidad y su cantidad cuando hay al menos 5 valoraciones (un "—"
atenuado con el texto accesible "menos de 5 valoraciones" en otro caso), la columna "Tú" con las
mismas marcas que la grilla y, al final, el botón de acciones del disco. En Apariciones, la fila
SHALL indicar el artista principal del disco. En móvil, la tabla SHALL reducirse a año, título,
"Tú" y el botón de acciones, con la etiqueta de tipo (si corresponde) y la media en una segunda
línea bajo el título, sin desbordamiento horizontal.

Los encabezados Año, Título, Media y Tú SHALL permitir ordenar la tabla: el primer uso ordena
en el sentido natural de la columna (Año ascendente; Título de la A a la Z; Media y Tú
descendente) y el siguiente lo invierte, con el orden vigente anunciado en el encabezado para
lectores de pantalla. Por defecto la tabla SHALL ordenarse por Año ascendente. Los discos sin
valor en la columna ordenada SHALL ir al final en cualquier sentido, con el título como
desempate. En la columna "Tú", los discos con las mismas estrellas SHALL ordenarse antes por
el puntaje detallado propio (en el mismo sentido de la columna, con los que no tienen puntaje
detallado después de los que sí) y solo después por título; el puntaje no se muestra en la
tabla. Los títulos SHALL compararse según el idioma de la interfaz, con los números por su
valor ("Vol. 2" antes que "Vol. 10") y sin quitar artículos iniciales; los títulos iguales SHALL
desempatarse por año ascendente, con los discos sin año al final. Cambiar de sección SHALL
volver al orden por defecto.

#### Scenario: Disco con pocas valoraciones

- **WHEN** un disco en vivo tiene 3 valoraciones
- **THEN** su fila muestra "—" en la columna Media, con el texto accesible "menos de 5
  valoraciones"

#### Scenario: Aparición

- **WHEN** el artista figura como invitado en un sencillo de otro artista
- **THEN** la fila en Apariciones indica ese artista principal

#### Scenario: Álbum sin etiqueta de tipo

- **WHEN** Principal muestra en tabla un álbum de estudio y un EP
- **THEN** solo el EP lleva etiqueta de tipo junto al título, y la tabla no tiene columna Tipo

#### Scenario: Ordenar por tu nota

- **WHEN** una persona activa el encabezado "Tú" en la tabla de Principal
- **THEN** los discos quedan de su nota más alta a la más baja, con los que no calificó al final

#### Scenario: Ordenar por título

- **WHEN** una persona activa el encabezado "Título" en la tabla de Sencillos
- **THEN** los discos quedan de la A a la Z, con "Vol. 2" antes que "Vol. 10" y los títulos
  repetidos del más antiguo al más reciente

#### Scenario: Invertir el orden

- **WHEN** una persona activa "Año" dos veces
- **THEN** la tabla queda del disco más reciente al más antiguo, con los discos sin año al final

#### Scenario: Desempate por puntaje detallado
- **WHEN** una persona ordena "Tú" de mayor a menor y tiene tres discos de 4 estrellas con
  puntajes 78, 72 y sin puntaje
- **THEN** quedan en ese orden (78, 72, sin puntaje) y los discos de 4½ estrellas van antes
  que todos ellos

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

### Requirement: Buscador de la discografía

Cuando la discografía del artista tiene al menos 20 discos en total, la pestaña Discografía SHALL
ofrecer un buscador en la barra de secciones; con menos, SHALL NOT mostrarse. En móvil SHALL
presentarse como un botón que despliega el campo a todo el ancho.

Mientras el campo tiene texto, el contenido de la sección activa SHALL reemplazarse por los discos
de **todas** las secciones que coinciden, agrupados por sección en el orden del selector, cada grupo
con su nombre y cantidad, en formato tabla con las mismas columnas, marcas y menú de acciones de la
vista tabla, sin importar la vista elegida para la sección. Los discos de cada grupo SHALL seguir
el orden de la tabla. El selector de vista SHALL ocultarse mientras se busca. Un disco SHALL
coincidir cuando su título contiene el texto buscado sin distinguir mayúsculas, acentos ni el tipo
de apóstrofo o comillas; en Apariciones también cuando lo contiene el nombre del artista principal;
y, si el texto es un año de cuatro cifras, cuando el disco es de ese año.

Mientras se busca, cada pastilla de sección SHALL mostrar la cantidad de coincidencias de esa
sección en lugar del total, atenuada cuando es cero, y SHALL llevar al grupo correspondiente de los
resultados. La cantidad total de resultados SHALL anunciarse a lectores de pantalla.

Vaciar el campo o pulsar Esc SHALL restaurar la sección activa con su vista y orden. La búsqueda
SHALL NOT reflejarse en la URL ni recordarse entre visitas.

Sin coincidencias, SHALL mostrarse un aviso con un enlace para buscar el mismo texto en el catálogo
completo. Si la discografía del artista todavía se está completando en segundo plano, los
resultados SHALL avisar que puede faltar algún disco.

#### Scenario: Discografía corta

- **WHEN** un artista tiene 12 discos en total
- **THEN** la pestaña Discografía no muestra buscador

#### Scenario: Coincidencias en varias secciones

- **WHEN** una persona escribe "home" en la discografía de Mötley Crüe, que tiene "Home Sweet
  Home" en Sencillos y un disco en vivo con "Home" en el título
- **THEN** se ven dos grupos, Sencillos y En vivo, con esos discos en tabla, y las pastillas
  muestran 0 en Principal, Recopilatorios y Otros, atenuadas

#### Scenario: Coincidencia tolerante

- **WHEN** una persona escribe "dont go away" (sin apóstrofo) o "don't" con apóstrofo recto
- **THEN** aparece "Don’t Go Away Mad (Just Go Away)", escrito con apóstrofo tipográfico

#### Scenario: Búsqueda por año

- **WHEN** una persona escribe "1989"
- **THEN** aparecen los discos de 1989 y los que tienen "1989" en el título

#### Scenario: Aparición por artista principal

- **WHEN** una persona escribe el nombre del artista principal de una aparición
- **THEN** esa aparición figura en el grupo Apariciones

#### Scenario: Salir de la búsqueda

- **WHEN** una persona busca desde Principal en grilla y pulsa Esc
- **THEN** vuelve Principal en grilla, y el selector de vista reaparece

#### Scenario: Sin resultados

- **WHEN** ningún disco coincide con "zzz"
- **THEN** se muestra el aviso vacío con un enlace a la búsqueda del catálogo con "zzz"

#### Scenario: Discografía incompleta

- **WHEN** una persona busca en un artista cuya discografía se sigue ingiriendo en segundo plano
- **THEN** los resultados avisan que la discografía todavía se está completando

