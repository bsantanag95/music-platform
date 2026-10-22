# my-ratings-view-modes Specification

## Purpose
Modos de visualización de la biblioteca "Mis valoraciones" (Detallada, Índice y Gráfico, este
último por defecto), con la nota al pasar el cursor en la pared de carátulas, agrupación por tipo
o por artista, barra de filtros con nombres visibles y entradas sin datos repetidos.
## Requirements
### Requirement: Modos de visualización de la biblioteca
`/me/ratings` SHALL ofrecer tres modos de visualización — Detallada, Índice y Gráfico — con un
conmutador de opciones excluyentes (`radiogroup`) navegable con las flechas. El modo por defecto
SHALL ser Gráfico, para distinguir esta sección de Favoritos y Want to Listen, que abren en
Detallada. La preferencia SHALL ser global de la persona, guardarse solo en
`localStorage` (clave `music-platform:rating-view-mode`) y aplicarse a todas las secciones de la
página. Hasta conocer la preferencia guardada, el listado SHALL mostrarse como un marcador de carga
neutro, no en el modo por defecto, de modo que la página NO SHALL pintar un modo y saltar después a
otro; la cabecera y la barra de herramientas NO SHALL esperar. Un valor guardado inválido SHALL
ignorarse, y un fallo al leer o escribir el almacenamiento NO SHALL romper la página. El conmutador
SHALL mostrarse si hay valoraciones o si hay búsqueda o filtros de tipo, estrellas, año o década
activos (aunque no haya resultados).

#### Scenario: Modo por defecto
- **WHEN** una persona sin preferencia guardada abre `/me/ratings`
- **THEN** ve la pared de carátulas del modo Gráfico

#### Scenario: La preferencia se recuerda
- **WHEN** la persona elige Detallada y vuelve a abrir `/me/ratings`
- **THEN** la página se muestra en modo Detallada, no en el defecto, sin mostrar antes la pared de carátulas

#### Scenario: Marcador mientras se lee la preferencia
- **WHEN** la página se renderiza y aún no se leyó la preferencia guardada
- **THEN** el listado es un marcador neutro (sin carátulas ni filas) y se reemplaza por el modo guardado sin pasar por otro modo

#### Scenario: Almacenamiento no disponible
- **WHEN** `localStorage` lanza al leer o escribir
- **THEN** la página funciona en modo Gráfico y el cambio de modo vale para la sesión

#### Scenario: Navegar el conmutador con el teclado
- **WHEN** el foco está en el modo Índice y se pulsa la flecha derecha
- **THEN** se selecciona el modo Gráfico y recibe el foco

#### Scenario: Conmutador con filtros sin resultados
- **WHEN** la persona filtra y no queda ninguna valoración
- **THEN** el conmutador de modo sigue visible

#### Scenario: Conmutador sin valoraciones
- **WHEN** una persona sin valoraciones abre la página sin filtros
- **THEN** el conmutador no se muestra

### Requirement: Modo Detallada
El modo Detallada SHALL mostrar cada valoración como la fila de la biblioteca: carátula, título
enlazado, artista, tipo, año, estrellas editables y puntaje (o un guion `—` si no hay). Los controles de
edición SHALL estar siempre visibles. La fila SHALL ser compacta: las filas SHALL separarse con una línea fina
en lugar de huecos, la carátula SHALL achicarse desde `sm`, y las estrellas y el puntaje SHALL agruparse a la
derecha con un ancho fijo para el puntaje, de modo que queden alineados de una fila a otra; en pantallas
anchas el título y la nota comparten línea; en pantallas angostas la nota baja bajo el título.

#### Scenario: Fila compacta en pantalla ancha
- **WHEN** la persona ve su biblioteca en modo Detallada en una pantalla ancha
- **THEN** el título y la nota (estrellas y puntaje) están en la misma línea, el puntaje queda alineado con el
  de las demás filas y cada fila se separa de la siguiente con una línea fina

#### Scenario: Fila completa
- **WHEN** la persona ve su biblioteca en modo Detallada
- **THEN** cada fila muestra carátula, título, artista, tipo, año, estrellas editables y el
  puntaje o un guion

### Requirement: Modo Índice
El modo Índice SHALL mostrar las valoraciones como una tabla: encabezados de columna (Título, Tipo, Año,
Estrellas, Nota; visibles desde `sm` y solo para lectores de pantalla debajo) y una fila por valoración con el
título enlazado y el artista como subtítulo, el tipo y el año en pantallas anchas, las estrellas y el puntaje
(`86/100`, o un guion `—` si no hay) alineado a la derecha, de modo que las columnas queden alineadas de una
fila a otra. En pantallas angostas el artista SHALL ir en una segunda línea bajo el título, cada uno truncado
por separado, en vez de truncarse junto al título; en pantallas anchas SHALL seguir en la misma línea. Tocar el
puntaje o el guion SHALL abrir el diálogo de puntaje. No SHALL mostrar carátulas.

#### Scenario: Fila compacta
- **WHEN** la persona cambia a modo Índice
- **THEN** ve una tabla con una fila por valoración con título, artista y nota a la derecha, sin
  carátula, y las columnas de año, estrellas y nota alineadas entre filas

#### Scenario: Artista en segunda línea en móvil
- **WHEN** la persona ve el modo Índice sin agrupar en una pantalla angosta
- **THEN** el artista aparece bajo el título, y ni el uno ni el otro quedan cortados por el otro

#### Scenario: Abrir el diálogo desde el índice
- **WHEN** activa el puntaje de una fila del índice
- **THEN** se abre el diálogo de puntaje con la valoración de esa fila

### Requirement: Agrupación de la biblioteca
La biblioteca SHALL poder agruparse con un selector "Agrupar" con tres opciones: "Por tipo" (por
defecto), "Por artista" y "Sin agrupar". Con "Por tipo" SHALL mostrar dos secciones, Álbumes y
Canciones, en ese orden, cada una con su título y el contador de valoraciones de ese tipo
(`counts`); una sección sin valoraciones SHALL omitirse. Con "Por artista" SHALL mostrar una
sección por artista principal acreditado, ordenadas por nombre sin distinguir mayúsculas, con el nombre del artista enlazado a su página como encabezado y las valoraciones sin
artista en una sección "Sin artista" al final; dentro de cada sección SHALL separar "Álbumes" y
"Canciones" con un subencabezado (los álbumes primero), omitiendo el que no tenga entradas, y el
orden elegido SHALL regir dentro de cada subsección. Una línea sobre las secciones SHALL explicar ese
orden (artistas de la A a la Z; el orden elegido rige dentro de cada uno). El encabezado de artista SHALL
llevar el contador de sus valoraciones solo cuando ya estén cargadas todas las valoraciones (sin página
siguiente), porque entonces es exacto; mientras haya más páginas NO SHALL llevar contador, ya que la
sección puede quedar cortada entre páginas y el servidor no devuelve totales por artista. Con "Sin
agrupar" SHALL mostrar una lista única sin encabezados. La agrupación SHALL
aplicarse igual en los tres modos y respetar los filtros. Los artistas NO SHALL ser una opción del
filtro de tipo, porque no se valoran: "Por artista" solo reúne las valoraciones de álbumes y
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
- **WHEN** mira el filtro de tipo
- **THEN** solo ofrece Todo, Álbumes y Canciones, y ningún contador cuenta artistas

#### Scenario: Agrupar por artista
- **WHEN** elige "Por artista" y tiene 2 álbumes y 1 canción de Heart, y 1 álbum de Aimee Mann
- **THEN** ve la sección "Aimee Mann" con "Álbumes" (1) y la sección "Heart" con "Álbumes" (2) y
  "Canciones" (1), en ese orden, y los encabezados de artista enlazan a su página

#### Scenario: Contador de artista con todo cargado
- **WHEN** agrupa por artista y no hay más páginas, y Heart tiene 3 valoraciones
- **THEN** el encabezado "Heart" muestra el contador 3

#### Scenario: Sin contador de artista con más páginas
- **WHEN** agrupa por artista y hay más páginas por cargar
- **THEN** los encabezados de artista no llevan contador, y aparece al cargar la última página

#### Scenario: Orden explicado
- **WHEN** agrupa por artista
- **THEN** una línea sobre las secciones dice que van de la A a la Z y que el orden elegido rige dentro de cada artista

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
mostrarse siempre que exista. La omisión SHALL aplicarse en los tres modos (en la leyenda de la ficha de la
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
La página SHALL mostrar una barra con el buscador, el filtro de tipo en segmentos y los selectores de año,
década, orden y agrupar, con el mismo estilo liviano que las demás secciones personales, y un control
"Limpiar filtros" visible cuando haya algún filtro activo. El filtro de estrellas SHALL ser el histograma del
resumen. Cada selector SHALL mostrar su nombre (Año, Década, Ordenar, Agrupar) de forma visible sobre el
control, sin necesidad de abrirlo, de modo que una opción neutra como "Todos" nunca quede sin contexto. El
buscador SHALL aplicarse tras una breve pausa al escribir. Los filtros, el orden, la búsqueda y la agrupación
SHALL reflejarse en la URL para poder recargar o compartir el enlace sin perder el estado; el modo de
visualización NO SHALL reflejarse en la URL.

#### Scenario: Estado en la URL
- **WHEN** la persona filtra por 5 estrellas y busca "abbey"
- **THEN** la URL conserva `stars=5` y `q=abbey`, y al recargar la página ve el mismo resultado

#### Scenario: Selectores con nombre visible
- **WHEN** la persona abre `/me/ratings` sin filtros
- **THEN** cada selector muestra su nombre visible sobre el control, p. ej. "Década" sobre
  "Todas" y "Agrupar" sobre "Por tipo"

#### Scenario: Limpiar filtros
- **WHEN** hay filtros activos y pulsa "Limpiar filtros"
- **THEN** se restablecen el buscador, los filtros, el orden y la agrupación a sus valores por
  defecto

#### Scenario: El modo no viaja en la URL
- **WHEN** la persona cambia de modo
- **THEN** la URL no cambia

#### Scenario: Estrellas y tipo en la URL
- **WHEN** la persona pulsa la barra de 4★ y el segmento "Canciones"
- **THEN** la URL conserva `stars=4` y `type=recording`

### Requirement: Contenedor de ancho único
`/me/ratings` SHALL usar el mismo ancho máximo en los tres modos de visualización, de modo que cambiar
de modo no mueva la cabecera, la barra de herramientas ni el conmutador. El título de la página SHALL
alinearse a la izquierda con el resto del contenido.

#### Scenario: Cambiar de modo no cambia el ancho
- **WHEN** la persona pasa de Detallada a Gráfico en una pantalla ancha
- **THEN** el contenedor conserva el mismo ancho y la cabecera y la barra no se mueven

#### Scenario: Título alineado
- **WHEN** la persona abre `/me/ratings`
- **THEN** el título "Valoraciones" empieza en el mismo borde izquierdo que el resumen y la barra de filtros

### Requirement: Contadores honestos con filtros
La cabecera SHALL distinguir la biblioteca de un resultado filtrado. Sin búsqueda ni filtros de tipo,
estrellas, año o década, SHALL mostrar el total de valoraciones y el desglose por tipo, y "Sin
valoraciones" solo si la biblioteca está vacía. Con alguno de esos filtros activos SHALL contar
resultados ("3 resultados", "1 resultado") y NO SHALL decir "Sin valoraciones"; con 0 resultados SHALL
decir "Ningún resultado" y omitir el desglose "sin álbumes · sin canciones". Cambiar solo el orden o la
agrupación NO SHALL cambiar la etiqueta a "resultados".

#### Scenario: Filtro sin resultados
- **WHEN** la persona tiene valoraciones y busca un texto que no coincide con ninguna
- **THEN** la cabecera dice "Ningún resultado" y no dice "Sin valoraciones" ni "sin álbumes · sin canciones"

#### Scenario: Filtro con resultados
- **WHEN** filtra por 5★ y hay 7 valoraciones que coinciden
- **THEN** la cabecera dice "7 resultados" con su desglose por tipo

#### Scenario: Solo orden o agrupación
- **WHEN** cambia el orden a "Peor nota" sin otros filtros
- **THEN** la cabecera sigue mostrando el total de valoraciones de la biblioteca

#### Scenario: Biblioteca vacía
- **WHEN** una persona sin valoraciones abre la página
- **THEN** la cabecera dice "Sin valoraciones" y el estado vacío invita a explorar el catálogo

### Requirement: Un solo control para limpiar filtros
Mientras haya filtros activos SHALL haber un único "Limpiar filtros" visible. Cuando no hay
resultados y el estado vacío ofrece su propio "Limpiar filtros", la barra de herramientas NO SHALL
mostrar otro.

#### Scenario: Sin resultados
- **WHEN** los filtros no dejan ninguna valoración
- **THEN** hay exactamente un botón "Limpiar filtros", el del estado vacío

#### Scenario: Con resultados
- **WHEN** hay filtros activos y resultados
- **THEN** la barra muestra "Limpiar filtros" y no hay estado vacío

### Requirement: Áreas táctiles con puntero grueso
En dispositivos con puntero grueso (`pointer: coarse`), las estrellas editables de la fila Detallada, el
conmutador de modo de visualización, los botones de puntaje (el puntaje y el guion de "sin afinar", en las tres
vistas), los segmentos de tipo y las barras del histograma SHALL tener al menos 44 px de alto, y cada mitad de
estrella editable SHALL medir al menos 24 px de ancho. Con puntero fino su tamaño NO SHALL cambiar. Cuando las
estrellas y el puntaje no quepan en una línea, el puntaje SHALL bajar a la línea siguiente en vez de desbordar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso y ve la fila Detallada
- **THEN** cada estrella editable mide 48 × 44 px, y el conmutador y el botón de puntaje miden al menos 44 px de alto

#### Scenario: Segmentos e histograma en el teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada segmento de tipo y cada barra del histograma miden al menos 44 px de alto

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto

### Requirement: Resumen con promedio e histograma de estrellas
Bajo el título, `/me/ratings` SHALL mostrar un resumen con el total y el desglose por tipo (según los contadores
honestos), el promedio de estrellas del conjunto visible y un histograma de diez barras, una por cada valor de ½
a 5, con la cantidad de valoraciones de cada una (`facets.stars`). El promedio SHALL calcularse a partir de esas
mismas facetas — el valor del filtro de estrellas si lo hay, o la media ponderada de los diez valores — y SHALL
omitirse sin valoraciones. Cada barra SHALL ser un botón con `aria-pressed` que activa el filtro de estrellas de
ese valor; pulsar la barra activa SHALL quitar el filtro. Cada barra SHALL tener una etiqueta accesible con el
valor y la cantidad (por ejemplo "4,5 estrellas: 3 valoraciones"), y el eje SHALL rotular solo las estrellas
enteras. El histograma SHALL ocultarse si no hay ninguna valoración y no hay filtro de estrellas; con filtro de
estrellas activo SHALL mostrarse siempre, para poder quitarlo. Tras cambiar las estrellas desde una fila o
borrar una nota, el histograma, el promedio y los segmentos SHALL actualizarse en el lugar, sin recargar ni
reordenar la lista.

#### Scenario: Ver la distribución
- **WHEN** una persona con 3 valoraciones de 5★ y 2 de 4,5★ abre `/me/ratings`
- **THEN** ve el promedio de 4,8★ y diez barras, con 3 sobre la de 5★ y 2 sobre la de 4,5★

#### Scenario: Filtrar desde una barra
- **WHEN** pulsa la barra de 4,5★
- **THEN** la barra queda activa, la lista muestra solo las de 4,5★, las demás barras conservan su cantidad y el promedio es 4,5★

#### Scenario: Quitar el filtro
- **WHEN** vuelve a pulsar la barra activa
- **THEN** se quita el filtro de estrellas y la lista vuelve a mostrar todas

#### Scenario: Etiqueta accesible
- **WHEN** un lector de pantalla recorre la barra de 4,5★ con 2 valoraciones
- **THEN** anuncia "4,5 estrellas: 2 valoraciones" y si está activa

#### Scenario: Ajuste tras editar
- **WHEN** cambia una valoración de 5★ a 4★ desde su fila
- **THEN** la barra de 5★ baja en uno, la de 4★ sube en uno y el promedio se recalcula, sin que la fila cambie de lugar

#### Scenario: Ajuste tras borrar
- **WHEN** borra una valoración de 5★ de tipo canción
- **THEN** la barra de 5★ y el segmento "Canciones" bajan en uno

#### Scenario: Sin valoraciones
- **WHEN** una persona sin valoraciones abre la página sin filtros
- **THEN** no hay histograma ni promedio

#### Scenario: Filtro activo sin resultados
- **WHEN** hay un filtro de estrellas activo y ninguna valoración coincide
- **THEN** el histograma sigue visible con la barra activa, para poder quitar el filtro

### Requirement: Filtro de tipo en segmentos con contador
El filtro de tipo SHALL ser un control segmentado de botones con `aria-pressed` — "Todo", "Álbumes" y
"Canciones" — junto al buscador, cada uno con su cantidad (`facets.types`; "Todo" es la suma de las dos). El
segmento activo SHALL marcarse y pulsarlo de nuevo no SHALL quitarlo: para volver a todos se elige "Todo". Los
artistas NO SHALL ofrecerse como tipo, porque no se valoran.

#### Scenario: Cambiar de tipo
- **WHEN** la persona pulsa "Canciones"
- **THEN** el segmento queda activo, la lista muestra solo canciones y los contadores de "Todo" y "Álbumes" no cambian

#### Scenario: Contadores con búsqueda
- **WHEN** busca "heart" y 4 de sus resultados son álbumes y 2 son canciones
- **THEN** los segmentos muestran "Todo 6", "Álbumes 4" y "Canciones 2"

#### Scenario: Volver a todos
- **WHEN** con "Canciones" activo pulsa "Todo"
- **THEN** se quita el filtro de tipo y la URL deja de llevar `type`

### Requirement: Modo Gráfico con la nota visible
El modo Gráfico SHALL mostrar una pared de carátulas cuadradas con su leyenda debajo: el título, una línea de
detalle con el artista, el tipo y el año (según la agrupación), las estrellas y el puntaje (`86`, o un guion
`—` si no hay). La carátula SHALL enlazar a la página del álbum o la canción y NO SHALL llevar overlay ni botones
encima. El puntaje SHALL ser un botón que abre el diálogo de puntaje; con puntero grueso SHALL medir al menos 44
px de alto. La etiqueta accesible del enlace de la carátula SHALL exponer título, artista, tipo, estrellas y
puntaje ("Sin afinar" si no hay), y el botón del puntaje SHALL llevar la etiqueta "Editar la nota de …" (o
"Afinar puntaje" si no hay puntaje). Cada carátula SHALL llevar una marca fija de tipo (disco para álbum, nota
musical para canción). Una canción sin carátula propia SHALL mostrar la carátula del álbum donde aparece o, si no
hay, el disco genérico. Las carátulas de la primera fila de la pared SHALL cargarse con prioridad. El contenedor
SHALL tener el ancho único de la página.

#### Scenario: Ver la nota sin pasar el cursor
- **WHEN** la persona abre `/me/ratings` en modo Gráfico y no hay cursor encima de ninguna carátula
- **THEN** cada ficha muestra bajo la carátula el título, el detalle, las estrellas y el puntaje o un guion

#### Scenario: Navegar a la ficha
- **WHEN** hace clic sobre la carátula
- **THEN** navega a la página del álbum o la canción

#### Scenario: Editar desde la pared
- **WHEN** activa el puntaje de una ficha
- **THEN** se abre el diálogo de puntaje con la valoración de esa carátula y no se navega

#### Scenario: Sin overlay sobre el arte
- **WHEN** la persona pasa el cursor o enfoca una carátula
- **THEN** no aparece ningún overlay ni botón sobre la imagen, y el foco se ve en el enlace y en el botón del puntaje

#### Scenario: Táctil
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada ficha muestra la misma leyenda y el botón del puntaje mide al menos 44 px de alto

#### Scenario: Distinguir canción de álbum
- **WHEN** la pared muestra un álbum y una canción sin agrupar
- **THEN** el álbum lleva la marca de disco y la canción la de nota musical, y la línea de detalle de cada
  una dice "Álbum" o "Canción"

#### Scenario: Canción sin carátula
- **WHEN** una canción valorada no tiene carátula
- **THEN** la pared muestra el disco genérico y la ficha funciona igual

#### Scenario: Etiqueta accesible completa
- **WHEN** un lector de pantalla recorre una carátula valorada con 4,5★ y 86
- **THEN** anuncia título, artista, tipo, "4,5 estrellas" y "86/100"

#### Scenario: Primera fila con prioridad
- **WHEN** la pared se muestra con más de seis carátulas
- **THEN** las seis primeras se cargan con prioridad y el resto de forma diferida

