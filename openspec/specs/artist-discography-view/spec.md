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
sección por defecto. Cambiar de sección desde el selector SHALL mostrarla sin pedir la página al servidor (las
secciones ya están en el cliente) y SHALL escribirla en la URL como una entrada del historial: "atrás" SHALL volver a la
sección anterior. Un clic con tecla modificadora SHALL conservar el comportamiento del navegador (abrir la sección en
otra pestaña).

#### Scenario: Enlace a los discos en vivo

- **WHEN** una persona abre `/{locale}/artist/{id}?section=live`
- **THEN** la discografía se muestra con En vivo activa

#### Scenario: Cambio de sección sin recargar

- **WHEN** una persona en Principal pulsa "En vivo"
- **THEN** la tabla de En vivo aparece sin una petición al servidor y la URL pasa a `?section=live`

#### Scenario: Atrás vuelve a la sección anterior

- **WHEN** una persona pasa de Principal a En vivo y pulsa "atrás" en el navegador
- **THEN** la discografía vuelve a Principal

#### Scenario: Abrir una sección en otra pestaña

- **WHEN** una persona pulsa "En vivo" con Ctrl o Cmd
- **THEN** el navegador abre `?section=live` en otra pestaña y la actual no cambia

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
los EP de Principal cuando Principal no se parte en bloques (requirement "Principal en bloques"), el botón de acciones del disco (capability `discography-quick-actions`) y,
para el usuario en sesión, una franja de marcas sobre la base de la carátula con su nota ("★ 4½")
o ✓ si solo lo escuchó, ♥ si es favorito y el marcador si está en Pendiente; sin marcas, la
franja SHALL omitirse. Cada marca SHALL tener un texto accesible. La grilla SHALL mostrar como
máximo 48 discos por bloque y una acción "Mostrar más" que agrega los siguientes 48.

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
mismas marcas que la grilla y, al final, el botón de acciones del disco. La columna "Media" SHALL
mostrarse solo si al menos un disco de la tabla llega a 5 valoraciones, y la columna "Tú" solo con
sesión iniciada: una columna que sería "—" o vacía en todas las filas SHALL NOT mostrarse. En Apariciones, la fila
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
tabla, salvo en el tooltip y el texto accesible de la nota propia (`Tu nota: 4,5 · 86/100`). Los títulos SHALL compararse según el idioma de la interfaz, con los números por su
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

#### Scenario: Tooltip con el puntaje propio
- **WHEN** una persona con 4,5 estrellas y puntaje 86 sobre un disco pasa el puntero por su
  nota en la columna "Tú"
- **THEN** el tooltip dice `Tu nota: 4,5 · 86/100`, y sin puntaje dice `Tu nota: 4,5`

#### Scenario: Ningún disco llega al umbral

- **WHEN** una persona abre la tabla de En vivo y ningún disco tiene 5 valoraciones
- **THEN** la tabla no tiene columna Media

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre la tabla de una sección
- **THEN** la tabla no tiene columna "Tú"

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

### Requirement: Selector de secciones en móvil

En un viewport móvil el selector de secciones SHALL ocupar una sola línea con desplazamiento horizontal propio, sin
partir el nombre de una sección y sin desbordar la página.

#### Scenario: Seis secciones en 375 px

- **WHEN** una persona abre en 375 px un artista con las seis secciones
- **THEN** las secciones ocupan una línea que se desplaza de lado y el primer disco queda más arriba que con las
  secciones en varias líneas

### Requirement: Principal en bloques

Cuando Principal tiene álbumes y EP, SHALL mostrarse en dos bloques con título y cantidad: **Álbumes** primero y **EP**
debajo. En la grilla, el bloque de EP SHALL usar carátulas más chicas (3 columnas en móvil, 6 en tableta y 8 en
escritorio, frente a 2, 4 y 6 de los álbumes) y sus tarjetas SHALL NOT llevar la etiqueta "EP"; en la tabla, cada bloque
SHALL ser un grupo con su título, y el orden se aplica dentro de cada grupo. Una Principal con un solo tipo y el resto de
las secciones SHALL mostrarse en un solo bloque sin título. "Mejor valorado" SHALL seguir marcándose en el bloque que
contenga el disco.

#### Scenario: Banda con álbumes y EP

- **WHEN** una persona abre Principal de Iron Maiden (17 álbumes y 19 EP)
- **THEN** ve "Álbumes 17" en la grilla grande y debajo "EP 19" con carátulas más chicas, sin etiqueta EP en las
  tarjetas

#### Scenario: Solo EP

- **WHEN** Principal de un artista solo tiene EP
- **THEN** se muestra un solo bloque sin título y cada tarjeta lleva la etiqueta "EP"

#### Scenario: Tabla de Principal

- **WHEN** una persona cambia Principal a tabla
- **THEN** la tabla tiene un grupo "Álbumes" y otro "EP", cada uno con su cantidad

### Requirement: Disco sin carátula en la grilla

En la grilla, un disco sin carátula (ausencia confirmada o imagen que no se pudo resolver) SHALL mostrar en el cuadro su
título y su año en lugar de la silueta de vinilo. El relleno SHALL ser decorativo para lectores de pantalla (el título
ya está en el enlace de la tarjeta). La tabla SHALL seguir usando la miniatura de siempre.

#### Scenario: EP sin carátula

- **WHEN** Principal muestra "Christmas EP" (1984) sin carátula
- **THEN** su cuadro dice "Christmas EP" y "1984" en lugar del vinilo vacío

### Requirement: Separadores por década

En la grilla, un bloque con 12 discos o más SHALL separarse por décadas: un separador con el nombre de la década
("Años 80", "Años 2000"; "1980s" en inglés) antes del primer disco de cada una, y "Sin año" antes de los discos sin año.
Un bloque con menos de 12 discos y la tabla SHALL NOT llevar separadores.

#### Scenario: Álbumes de una banda longeva

- **WHEN** el bloque de álbumes de Iron Maiden (17) se muestra en grilla
- **THEN** los discos quedan bajo "Años 80", "Años 90", "Años 2000", "Años 2010" y "Años 2020"

#### Scenario: Pocos discos

- **WHEN** una sección tiene 8 discos en grilla
- **THEN** no hay separadores de década

### Requirement: Barra de la discografía fija

La barra de la discografía (secciones, buscador y vista) SHALL quedar fija bajo las pestañas del artista al bajar por la
página, con fondo opaco, en cualquier viewport; en móvil las secciones, el buscador y la vista SHALL compartir una fila
y las secciones se desplazan de lado. Al cambiar de sección con la barra ya fija, la página SHALL desplazarse para que la
sección nueva empiece justo debajo de la barra. Los títulos de bloque y los grupos de resultados de la búsqueda SHALL
quedar visibles debajo de la barra al llevarlos a la vista.

#### Scenario: Bajar por una discografía larga

- **WHEN** una persona baja hasta los discos de 2010 en Principal
- **THEN** las pestañas y la barra de secciones siguen visibles arriba

#### Scenario: Cambiar de sección a mitad de página

- **WHEN** con la barra fija la persona pulsa "En vivo"
- **THEN** la tabla de En vivo empieza justo debajo de la barra

