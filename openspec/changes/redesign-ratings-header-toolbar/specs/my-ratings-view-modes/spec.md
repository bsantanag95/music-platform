## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Áreas táctiles con puntero grueso
En dispositivos con puntero grueso (`pointer: coarse`), las estrellas editables de la fila Detallada, el
conmutador de modo de visualización, los botones "Sin afinar", los segmentos de tipo y las barras del
histograma SHALL tener al menos 44 px de alto, y cada mitad de estrella editable SHALL medir al menos 24 px de
ancho. Con puntero fino su tamaño NO SHALL cambiar. Cuando las estrellas y el puntaje no quepan en una línea,
el puntaje SHALL bajar a la línea siguiente en vez de desbordar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso y ve la fila Detallada
- **THEN** cada estrella editable mide 48 × 44 px, y el conmutador y el botón "Sin afinar" miden al menos 44 px de alto

#### Scenario: Segmentos e histograma en el teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada segmento de tipo y cada barra del histograma miden al menos 44 px de alto

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto
