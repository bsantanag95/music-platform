## MODIFIED Requirements

### Requirement: Página de búsqueda avanzada con pestañas

La aplicación SHALL ofrecer `/search/advanced` con tres pestañas, **Artistas**, **Álbumes** y **Canciones**, elegidas por
`type` (`artist` | `album` | `song`; ausente o desconocido → `artist`). Cada pestaña SHALL ser un enlace en forma de
pastilla, como las pestañas de `/search`, y la activa SHALL marcarse con `aria-current="page"`. La página SHALL usar el
marco de 88rem del resto del sitio y un título de página visible. Debajo de las pestañas SHALL mostrarse el formulario del
tipo activo y, si hay algún criterio, los resultados con la misma presentación que `/search`. Sin ningún criterio, la página
SHALL mostrar solo el formulario y SHALL NOT consultar MusicBrainz ni la base.

#### Scenario: Abrir la página
- **WHEN** una persona abre `/search/advanced`
- **THEN** ve la pestaña Artistas activa con su formulario vacío y ningún resultado

#### Scenario: Pestaña por URL
- **WHEN** una persona abre `/search/advanced?type=song&q=hallelujah`
- **THEN** ve la pestaña Canciones activa, el título prellenado con `hallelujah` y los resultados de canciones

#### Scenario: Marco del sitio
- **WHEN** una persona abre `/search/advanced` en 1440 px
- **THEN** el contenido usa el mismo marco que `/search` y la pestaña activa es una pastilla marcada

### Requirement: Formulario agrupado

El formulario de cada pestaña SHALL agrupar sus campos en conjuntos con nombre: Artistas en **Identidad** (nombre, tipo,
rol), **Origen** (país, ciudad o región), **Época** (año de nacimiento o formación, estado) y **Del catálogo** (activo
entre, género, premios); Álbumes en **Identidad** (título, artista), **Lanzamiento** (año, tipo) y **Del catálogo**
(género, país del artista, premios); Canciones en **Identidad** (título, artista, álbum) y **Lanzamiento** (tipo,
duración). El grupo **Del catálogo** SHALL llevar junto a su título una etiqueta visible "solo lo ya cargado" y una ayuda
legible que diga que esos campos buscan solo en lo que ya está en el catálogo. Las elecciones de pocas opciones SHALL verse
como pastillas sin abrir un desplegable: **Tipo** de artista (Cualquiera, Grupo, Solista, Otras personas) y **Estado**
(Cualquiera, En actividad, Ya no en actividad) como botones de radio, y **Tipo de lanzamiento** como casillas, todos
operables con teclado y enviados como campos del formulario también sin JavaScript, con los mismos parámetros que antes. Con JavaScript, una elección en Cualquiera no se envía.
Los campos de texto, selectores y el selector de países SHALL tener el mismo alto y tipografía; la casilla de
coincidencia exacta SHALL ir debajo de su campo; la etiqueta SHALL ir arriba y la ayuda debajo del control, de modo que
los controles de una misma fila queden alineados. En los rangos, "desde" y "hasta" SHALL ir en el texto de ejemplo de
cada control. Un grupo con tres campos SHALL usar tres columnas en pantallas anchas. Los campos SHALL tener un fondo más
oscuro que la tarjeta, las casillas SHALL ser oscuras hasta marcarlas y un selector sin elección SHALL mostrar su texto
atenuado, como un texto de ejemplo. Los títulos de grupo SHALL NOT usar el color de acento. Ningún texto del formulario
(ayudas, contadores, leyendas) SHALL medir menos de 12 px.

#### Scenario: Grupos de Artistas
- **WHEN** una persona abre la pestaña Artistas
- **THEN** ve los grupos Identidad, Origen, Época y Del catálogo, y el campo Nombre del mismo ancho que Tipo

#### Scenario: Ayuda del grupo del catálogo
- **WHEN** una persona abre la pestaña Álbumes
- **THEN** ve el grupo Del catálogo con la etiqueta "solo lo ya cargado", Género, País del artista y Premios, y la ayuda
  que explica que solo buscan en lo que ya está en el catálogo

#### Scenario: Grupo de tres campos
- **WHEN** una persona abre la pestaña Canciones en una pantalla ancha
- **THEN** Título, Artista y Álbum quedan en una sola fila, sin una celda vacía

#### Scenario: Tipo como pastillas
- **WHEN** una persona en Artistas elige la pastilla Grupo
- **THEN** la pastilla queda marcada, el año pasa a llamarse "Año de formación" y al buscar la URL lleva `artistType=group`

#### Scenario: Sin JavaScript
- **WHEN** una persona sin JavaScript marca Grupo y En actividad y envía el formulario
- **THEN** la URL lleva `artistType=group` y `ended=0`; una elección en Cualquiera llega vacía y el servidor la ignora,
  como con el desplegable anterior

#### Scenario: Tipo de lanzamiento
- **WHEN** una persona en Álbumes marca las pastillas De estudio y Directos y otros
- **THEN** ambas quedan marcadas y la búsqueda lleva `category=studio&category=live_other`
