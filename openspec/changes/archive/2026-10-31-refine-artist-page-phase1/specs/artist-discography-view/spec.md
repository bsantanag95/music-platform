## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Selector de secciones en móvil

En un viewport móvil el selector de secciones SHALL ocupar una sola línea con desplazamiento horizontal propio, sin
partir el nombre de una sección y sin desbordar la página.

#### Scenario: Seis secciones en 375 px

- **WHEN** una persona abre en 375 px un artista con las seis secciones
- **THEN** las secciones ocupan una línea que se desplaza de lado y el primer disco queda más arriba que con las
  secciones en varias líneas
