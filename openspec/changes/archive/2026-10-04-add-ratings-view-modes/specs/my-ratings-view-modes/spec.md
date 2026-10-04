## ADDED Requirements

### Requirement: Modos de visualización de la biblioteca
`/me/ratings` SHALL ofrecer tres modos de visualización — Detallada, Índice y Gráfico — con un
conmutador de opciones excluyentes (`radiogroup`) navegable con las flechas. El modo por defecto
SHALL ser Gráfico, para distinguir esta sección de Favoritos y Want to Listen, que abren en
Detallada. La preferencia SHALL ser global de la persona, guardarse solo en
`localStorage` (clave `music-platform:rating-view-mode`) y aplicarse a todas las secciones de la
página; el primer render SHALL usar el modo por defecto y reconciliarse con lo guardado tras el
montaje. Un valor guardado inválido SHALL ignorarse, y un fallo al leer o escribir el
almacenamiento NO SHALL romper la página. El conmutador SHALL mostrarse solo si hay valoraciones.

#### Scenario: Modo por defecto
- **WHEN** una persona sin preferencia guardada abre `/me/ratings`
- **THEN** ve la pared de carátulas del modo Gráfico, con el contenedor ensanchado

#### Scenario: La preferencia se recuerda
- **WHEN** la persona elige Detallada y vuelve a abrir `/me/ratings`
- **THEN** la página se muestra en modo Detallada, no en el defecto

#### Scenario: Almacenamiento no disponible
- **WHEN** `localStorage` lanza al leer o escribir
- **THEN** la página funciona en modo Gráfico y el cambio de modo vale para la sesión

#### Scenario: Navegar el conmutador con el teclado
- **WHEN** el foco está en el modo Índice y se pulsa la flecha derecha
- **THEN** se selecciona el modo Gráfico y recibe el foco

### Requirement: Modo Detallada
El modo Detallada SHALL mostrar cada valoración como la fila de la biblioteca: carátula, título
enlazado, artista, tipo, año, estrellas editables y puntaje (o "Sin afinar"). Los controles de
edición SHALL estar siempre visibles. La fila SHALL ser compacta: en pantallas anchas el título y
la nota comparten línea, de modo que la fila no sea más alta que su carátula; en pantallas
angostas la nota baja bajo el título.

#### Scenario: Fila compacta en pantalla ancha
- **WHEN** la persona ve su biblioteca en modo Detallada en una pantalla ancha
- **THEN** el título y la nota (estrellas y puntaje) están en la misma línea y la fila no supera la
  altura de la carátula

#### Scenario: Fila completa
- **WHEN** la persona ve su biblioteca en modo Detallada
- **THEN** cada fila muestra carátula, título, artista, tipo, año, estrellas editables y el
  puntaje o "Sin afinar"

### Requirement: Modo Índice
El modo Índice SHALL mostrar cada valoración como una fila compacta de texto: título enlazado con
el artista como subtítulo, tipo y año en pantallas anchas, y la nota (estrellas y `86/100`, o
estrellas y "Sin afinar") alineada a la derecha. Tocar el puntaje o "Sin afinar" SHALL abrir el
diálogo de puntaje. No SHALL mostrar carátulas.

#### Scenario: Fila compacta
- **WHEN** la persona cambia a modo Índice
- **THEN** ve una fila de texto por valoración con título, artista y nota a la derecha, sin
  carátula

#### Scenario: Abrir el diálogo desde el índice
- **WHEN** activa el puntaje de una fila del índice
- **THEN** se abre el diálogo de puntaje con la valoración de esa fila

### Requirement: Modo Gráfico con la nota al pasar el cursor
El modo Gráfico SHALL mostrar una pared de carátulas cuadradas sin título visible debajo. Al pasar
el cursor sobre una carátula, o al enfocarla con el teclado, SHALL desplegarse un overlay con la
nota (estrellas y puntaje `86/100`, o estrellas y "Sin afinar"), el título, el artista y la
acción "Editar nota", que abre el diálogo de puntaje. La carátula SHALL enlazar a la página del
álbum o la canción, y el overlay NO SHALL impedir esa navegación salvo en sus propios controles.
Cada carátula SHALL exponer su título, artista, estrellas y puntaje en su etiqueta accesible, de
modo que la nota no dependa del hover. En dispositivos sin hover (`hover: none`) el chip de nota y
la acción de editar SHALL estar siempre visibles, sin cubrir la carátula con el título. Cada
carátula SHALL llevar una marca fija de tipo (disco para álbum, nota musical para canción), visible
también sin hover, y el overlay SHALL indicar el tipo y el año junto al artista; la etiqueta
accesible SHALL incluir el tipo. Una canción sin carátula propia SHALL mostrar la
carátula del álbum donde aparece o, si no hay, el disco genérico. El contenedor SHALL ensancharse
en este modo.

#### Scenario: Ver la nota al pasar el cursor
- **WHEN** la persona pasa el cursor sobre la carátula de un álbum valorado con 4,5★ y 86
- **THEN** se despliega el overlay con 4,5 estrellas y `86/100`, el título del álbum y su artista

#### Scenario: Ver la nota con el teclado
- **WHEN** la persona enfoca con Tab una carátula
- **THEN** el overlay se despliega igual que con el cursor

#### Scenario: Navegar a la ficha
- **WHEN** hace clic sobre la carátula, fuera del botón "Editar nota"
- **THEN** navega a la página del álbum o la canción

#### Scenario: Editar desde la pared
- **WHEN** activa "Editar nota" en el overlay
- **THEN** se abre el diálogo de puntaje con la valoración de esa carátula y no se navega

#### Scenario: Sin hover
- **WHEN** la persona usa un dispositivo táctil (`hover: none`)
- **THEN** cada carátula muestra siempre el chip de nota y la acción de editar

#### Scenario: Distinguir canción de álbum sin hover
- **WHEN** la pared muestra un álbum y una canción sin agrupar y no hay cursor encima
- **THEN** el álbum lleva la marca de disco y la canción la de nota musical, y el overlay de cada
  una dice "Álbum" o "Canción"

#### Scenario: Canción sin carátula
- **WHEN** una canción valorada no tiene carátula
- **THEN** la pared muestra el disco genérico y el overlay funciona igual

### Requirement: Agrupación de la biblioteca
La biblioteca SHALL poder agruparse con un selector "Agrupar" con tres opciones: "Por tipo" (por
defecto), "Por artista" y "Sin agrupar". Con "Por tipo" SHALL mostrar dos secciones, Álbumes y
Canciones, en ese orden, cada una con su título y el contador de valoraciones de ese tipo
(`counts`); una sección sin valoraciones SHALL omitirse. Con "Por artista" SHALL mostrar una
sección por artista principal acreditado, ordenadas por nombre sin distinguir mayúsculas, con el nombre del artista enlazado a su página como encabezado y las valoraciones sin
artista en una sección "Sin artista" al final; dentro de cada sección SHALL separar "Álbumes" y
"Canciones" con un subencabezado (los álbumes primero), omitiendo el que no tenga entradas, y el
orden elegido SHALL regir dentro de cada subsección. El encabezado de artista NO SHALL llevar
contador. Con "Sin agrupar" SHALL mostrar una lista única sin encabezados. La agrupación SHALL
aplicarse igual en los tres modos y respetar los filtros. Los artistas NO SHALL ser una opción del
selector de tipo, porque no se valoran: "Por artista" solo reúne las valoraciones de álbumes y
canciones bajo su artista. La paginación SHALL ser continua entre secciones: cargar más SHALL
agregar entradas al final de la sección y subsección que corresponda.

#### Scenario: Secciones por tipo
- **WHEN** una persona con 12 álbumes y 3 canciones valorados abre `/me/ratings`
- **THEN** ve la sección "Álbumes" con 12 y la sección "Canciones" con 3

#### Scenario: Sección vacía
- **WHEN** filtra por tipo canción
- **THEN** ve solo la sección "Canciones", sin la sección "Álbumes"

#### Scenario: Sin agrupar
- **WHEN** elige "Sin agrupar"
- **THEN** ve una lista única, sin encabezados de sección, con álbumes y canciones mezclados según
  el orden elegido

#### Scenario: Los artistas no se valoran
- **WHEN** abre el selector de tipo
- **THEN** solo ofrece álbum y canción, y ningún contador cuenta artistas

#### Scenario: Agrupar por artista
- **WHEN** elige "Por artista" y tiene 2 álbumes y 1 canción de Heart, y 1 álbum de Aimee Mann
- **THEN** ve la sección "Aimee Mann" con "Álbumes" (1) y la sección "Heart" con "Álbumes" (2) y
  "Canciones" (1), en ese orden, y los encabezados de artista enlazan a su página

#### Scenario: Diferenciar canción de álbum bajo un artista
- **WHEN** una sección de artista tiene álbumes y canciones
- **THEN** los álbumes aparecen bajo el subencabezado "Álbumes" y las canciones, después, bajo
  "Canciones"

#### Scenario: Subsección vacía
- **WHEN** un artista solo tiene canciones valoradas
- **THEN** su sección muestra solo el subencabezado "Canciones"

#### Scenario: Valoración sin artista
- **WHEN** una canción valorada no tiene artista principal acreditado y se agrupa por artista
- **THEN** aparece en una sección "Sin artista" al final, sin enlace

#### Scenario: Cargar más
- **WHEN** hay más páginas y pulsa "Cargar más"
- **THEN** las entradas nuevas se suman a la sección de su tipo (o de su artista) y los contadores
  de tipo no cambian

### Requirement: Sin datos repetidos bajo un encabezado
Las entradas SHALL omitir los datos que el encabezado de su sección ya dice: con "Por artista" NO
SHALL repetir el artista ni el tipo (el encabezado nombra al artista y el subencabezado el tipo);
con "Por tipo" NO SHALL repetir el tipo; con "Sin agrupar" SHALL mostrar ambos. El año SHALL
mostrarse siempre que exista. La omisión SHALL aplicarse en los tres modos (en el overlay de la
pared, sin el artista ni el tipo, pero con el año) y NO SHALL afectar la etiqueta accesible de la
carátula, que conserva título, artista, tipo, estrellas y puntaje.

#### Scenario: Por artista sin repetir artista ni tipo
- **WHEN** la persona agrupa por artista y mira el modo Índice o Detallada
- **THEN** las filas muestran el título y la nota, sin el nombre del artista ni "Álbum"/"Canción",
  y conservan el año

#### Scenario: Por tipo sin repetir el tipo
- **WHEN** la persona agrupa por tipo
- **THEN** las filas muestran el artista pero no "Álbum"/"Canción"

#### Scenario: Sin agrupar muestra todo
- **WHEN** la persona elige "Sin agrupar"
- **THEN** cada entrada muestra su artista y su tipo

#### Scenario: La etiqueta accesible no pierde datos
- **WHEN** la pared está agrupada por artista
- **THEN** la etiqueta de cada carátula sigue incluyendo artista y tipo

### Requirement: Barra de filtros homogénea
La página SHALL mostrar una barra con el buscador y los selectores de tipo, estrellas, año,
década, orden y agrupar, con el mismo estilo liviano que las demás secciones personales, y un
control "Limpiar filtros" visible cuando haya algún filtro activo. Cada selector SHALL mostrar su
nombre (Tipo, Estrellas, Año, Década, Ordenar, Agrupar) de forma visible sobre el control, sin
necesidad de abrirlo, de modo que una opción neutra como "Todos" nunca quede sin contexto. El buscador SHALL aplicarse
tras una breve pausa al escribir. Los filtros, el orden, la búsqueda y la agrupación SHALL
reflejarse en la URL para poder recargar o compartir el enlace sin perder el estado; el modo de
visualización NO SHALL reflejarse en la URL.

#### Scenario: Estado en la URL
- **WHEN** la persona filtra por 5 estrellas y busca "abbey"
- **THEN** la URL conserva `stars=5` y `q=abbey`, y al recargar la página ve el mismo resultado

#### Scenario: Selectores con nombre visible
- **WHEN** la persona abre `/me/ratings` sin filtros
- **THEN** cada selector muestra su nombre visible sobre el control, p. ej. "Estrellas" sobre
  "Todas" y "Agrupar" sobre "Por tipo"

#### Scenario: Limpiar filtros
- **WHEN** hay filtros activos y pulsa "Limpiar filtros"
- **THEN** se restablecen el buscador, los filtros, el orden y la agrupación a sus valores por
  defecto

#### Scenario: El modo no viaja en la URL
- **WHEN** la persona cambia de modo
- **THEN** la URL no cambia
