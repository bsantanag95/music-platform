## ADDED Requirements

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
conmutador de modo de visualización y los botones "Sin afinar" SHALL tener al menos 44 px de alto, y cada
mitad de estrella SHALL medir al menos 24 px de ancho. Con puntero fino su tamaño NO SHALL cambiar. Cuando
las estrellas y el puntaje no quepan en una línea, el puntaje SHALL bajar a la línea siguiente en vez de
desbordar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso y ve la fila Detallada
- **THEN** cada estrella editable mide 48 × 44 px, y el conmutador y el botón "Sin afinar" miden al menos 44 px de alto

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto

## MODIFIED Requirements

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

### Requirement: Modo Índice
El modo Índice SHALL mostrar cada valoración como una fila compacta de texto: título enlazado con
el artista como subtítulo, tipo y año en pantallas anchas, y la nota (estrellas y `86/100`, o
estrellas y "Sin afinar") alineada a la derecha. En pantallas angostas el artista SHALL ir en una
segunda línea bajo el título, cada uno truncado por separado, en vez de truncarse junto al título; en
pantallas anchas SHALL seguir en la misma línea. Tocar el puntaje o "Sin afinar" SHALL abrir el
diálogo de puntaje. No SHALL mostrar carátulas.

#### Scenario: Fila compacta
- **WHEN** la persona cambia a modo Índice
- **THEN** ve una fila de texto por valoración con título, artista y nota a la derecha, sin
  carátula

#### Scenario: Artista en segunda línea en móvil
- **WHEN** la persona ve el modo Índice sin agrupar en una pantalla angosta
- **THEN** el artista aparece bajo el título, y ni el uno ni el otro quedan cortados por el otro

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
carátula del álbum donde aparece o, si no hay, el disco genérico. Las carátulas de la primera fila de
la pared SHALL cargarse con prioridad. El contenedor SHALL tener el ancho único de la página.

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

#### Scenario: Primera fila con prioridad
- **WHEN** la pared se muestra con más de seis carátulas
- **THEN** las seis primeras se cargan con prioridad y el resto de forma diferida

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
