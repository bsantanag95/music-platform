## MODIFIED Requirements

### Requirement: Formulario por entidad que escribe la URL

Cada pestaña SHALL tener su propio formulario `GET` hacia `/search/advanced`, con los campos de su entidad, el botón
**Buscar** y, cuando hay al menos un criterio, **Limpiar**. Al buscar, la página SHALL navegar a una URL con solo los campos que tienen valor; los campos
múltiples SHALL ir como parámetros repetidos. Sin JavaScript el formulario SHALL seguir funcionando y el servidor SHALL
tratar un parámetro vacío como ausente. **Limpiar** SHALL navegar a `/search/advanced?type=<tipo>`. El formulario SHALL
mostrar siempre los valores de la URL.

#### Scenario: Buscar con varios campos
- **WHEN** una persona en Artistas elige Chile y Argentina, escribe 1980 en "desde" y deja el nombre vacío
- **THEN** la página navega a `/search/advanced?type=artist&country=CL&country=AR&beginFrom=1980`

#### Scenario: Limpiar
- **WHEN** una persona pulsa **Limpiar** en Álbumes con varios campos llenos
- **THEN** la página navega a `/search/advanced?type=album` y el formulario queda vacío

### Requirement: Campos de Artistas

La pestaña Artistas SHALL ofrecer: **Nombre** (`q`) con **Coincidencia exacta** (`exact=1`), **Tipo** (cualquiera,
grupo, solista u otras personas: `artistType=group|solo|other`, con la ayuda "Integrantes, producción, músicos de
sesión" en Otras personas), **País** (uno o varios: `country`), **Ciudad o región** (`area`, lugar de nacimiento o
formación), **Año de nacimiento o formación** desde/hasta (`beginFrom`, `beginTo`) y **Estado** (`ended=0` en actividad,
`ended=1` ya no). La etiqueta del año SHALL seguir al tipo elegido: "Año de nacimiento" con Solista u Otras personas,
"Año de formación" con Grupo y "Año de nacimiento o formación" sin tipo, con el mismo parámetro y el mismo criterio.
Cada uno de estos campos SHALL aplicarse a las coincidencias locales y, salvo con Otras personas, a la consulta a
MusicBrainz. Además SHALL ofrecer los campos del catálogo de "Período de actividad", "Rol de una persona", "Género" y
"Premios".

#### Scenario: Grupos chilenos de los 80
- **WHEN** una persona busca en Artistas con `artistType=group`, `country=CL`, `beginFrom=1980` y `beginTo=1989`, sin
  nombre
- **THEN** ve grupos chilenos formados en esa década, como Los Prisioneros y La Ley

#### Scenario: Ciudad
- **WHEN** una persona busca en Artistas con `area=La Plata` y `artistType=group`
- **THEN** ve grupos formados en La Plata, como Patricio Rey y sus Redonditos de Ricota

#### Scenario: Nombre exacto
- **WHEN** una persona busca `Kiss` en Artistas con `exact=1`
- **THEN** solo ve artistas llamados exactamente "Kiss" y no "Kiss Kiss" ni "Kissin' Dynamite"

#### Scenario: Etiqueta según el tipo
- **WHEN** una persona elige Solista en el campo Tipo
- **THEN** el campo de año se llama "Año de nacimiento", y al elegir Grupo pasa a "Año de formación", sin recargar la
  página

### Requirement: Campos de Álbumes

La pestaña Álbumes SHALL ofrecer: **Título** (`q`) con **Coincidencia exacta** (`exact=1`), **Artista** (`artist`) con
**Coincidencia exacta** (`artistExact=1`), **Año** desde/hasta (`yearFrom`, `yearTo`) y **Tipo de lanzamiento** (una o
varias categorías: `category`). Cada uno de estos campos SHALL aplicarse a las coincidencias locales y a la consulta a
MusicBrainz. Además SHALL ofrecer los campos del catálogo de "Género", "Premios" y "País del artista en Álbumes".

#### Scenario: Discos de estudio de un período
- **WHEN** una persona busca en Álbumes con `artist=Iron Maiden`, `artistExact=1`, `yearFrom=1983`, `yearTo=1986` y
  `category=studio`, sin título
- **THEN** ve *Piece of Mind*, *Powerslave* y *Somewhere in Time*, y ningún directo ni recopilación

#### Scenario: Varios tipos
- **WHEN** una persona busca en Álbumes con `artist=Kiss`, `category=live_other` y `category=compilation`
- **THEN** ve directos y recopilaciones de Kiss y ningún disco de estudio

#### Scenario: Título exacto
- **WHEN** una persona busca `Powerslave` en Álbumes con `exact=1`
- **THEN** ve los álbumes titulados exactamente "Powerslave" y no "Powerslave / Single Collection 2"

### Requirement: Campos de Canciones

La pestaña Canciones SHALL ofrecer: **Título** (`q`) con **Coincidencia exacta** (`exact=1`), **Artista** (`artist`) con
**Coincidencia exacta** (`artistExact=1`), **Álbum** (`album`) con **Coincidencia exacta** (`albumExact=1`), **Tipo de
lanzamiento** (`category`, una o varias, sobre los álbumes donde aparece) y **Duración** mínima/máxima (`durMin`,
`durMax`). Con `artist`, la búsqueda SHALL tomar ese artista como intérprete sin detectar la interpretación. Sin título,
SHALL NOT aplicarse el filtro de relevancia del título.

#### Scenario: Canciones de un álbum
- **WHEN** una persona busca en Canciones con `artist=Jeff Buckley` y `album=Grace`, sin título
- **THEN** ve canciones de Jeff Buckley que aparecen en *Grace*, como *Hallelujah* y *Last Goodbye*

#### Scenario: Solo versiones de estudio
- **WHEN** una persona busca `hallelujah` en Canciones con `artist=Jeff Buckley` y `category=studio`
- **THEN** los grupos se forman con grabaciones que aparecen en discos de estudio

### Requirement: Formulario agrupado

El formulario de cada pestaña SHALL agrupar sus campos en conjuntos con nombre: Artistas en **Identidad** (nombre, tipo,
rol), **Origen** (país, ciudad o región), **Época** (año de nacimiento o formación, estado) y **Del catálogo** (activo
entre, género, premios); Álbumes en **Identidad** (título, artista), **Lanzamiento** (año, tipo) y **Del catálogo**
(género, país del artista, premios); Canciones en **Identidad** (título, artista, álbum) y **Lanzamiento** (tipo,
duración). El grupo **Del catálogo** SHALL llevar una ayuda que diga que esos campos buscan solo en lo que ya está en el
catálogo. Los campos de texto, selectores y el selector de países SHALL tener el mismo alto y tipografía; la casilla de
coincidencia exacta SHALL ir debajo de su campo; la etiqueta SHALL ir arriba y la ayuda debajo del control, de modo que
los controles de una misma fila queden alineados. En los rangos, "desde" y "hasta" SHALL ir en el texto de ejemplo de
cada control. Un grupo con tres campos SHALL usar tres columnas en pantallas anchas. Los campos SHALL tener un fondo más
oscuro que la tarjeta, las casillas SHALL ser oscuras hasta marcarlas y un selector sin elección SHALL mostrar su texto
atenuado, como un texto de ejemplo. Los títulos de grupo SHALL NOT usar el color de acento.

#### Scenario: Grupos de Artistas
- **WHEN** una persona abre la pestaña Artistas
- **THEN** ve los grupos Identidad, Origen, Época y Del catálogo, y el campo Nombre del mismo ancho que Tipo

#### Scenario: Ayuda del grupo del catálogo
- **WHEN** una persona abre la pestaña Álbumes
- **THEN** ve el grupo Del catálogo con Género, País del artista y Premios, y la ayuda que explica que solo buscan en
  lo que ya está en el catálogo

#### Scenario: Grupo de tres campos
- **WHEN** una persona abre la pestaña Canciones en una pantalla ancha
- **THEN** Título, Artista y Álbum quedan en una sola fila, sin una celda vacía

### Requirement: Envío fijo en móvil con cantidad de criterios

La fila de envío SHALL mostrar cuántos criterios tiene el formulario, contados como en la barra de criterios, y SHALL
actualizarse al cambiar cualquier campo. Sin criterios, la cifra SHALL NOT verse (solo la anuncian los lectores de
pantalla) y la fila SHALL NOT ofrecer **Limpiar**. En pantallas angostas SHALL quedar fija al pie de la pantalla mientras el
formulario está visible.

#### Scenario: Contar criterios
- **WHEN** una persona en Artistas elige Grupo, agrega Chile y escribe 1980 en "desde"
- **THEN** la fila de envío dice "3 criterios"

#### Scenario: Sin criterios
- **WHEN** una persona abre una pestaña con el formulario vacío
- **THEN** la fila de envío muestra solo **Buscar**
