# advanced-search-filters Specification

## Purpose
Búsqueda avanzada en su propia página `/search/advanced`, al estilo de Metal Archives: pestañas Artistas, Álbumes y Canciones, cada una con su formulario GET que escribe la URL; el nombre o título es un campo opcional con coincidencia exacta; cada campo (países, ciudad, inicio y estado del artista; artista, años y tipos del álbum; artista, álbum, tipos y duración de la canción) se aplica con el mismo criterio a la base local y a la consulta de MusicBrainz, con lectura tolerante de los criterios y cambio de pestaña con los campos equivalentes.
## Requirements
### Requirement: Página de búsqueda avanzada con pestañas

La aplicación SHALL ofrecer `/search/advanced` con tres pestañas, **Artistas**, **Álbumes** y **Canciones**, elegidas por
`type` (`artist` | `album` | `song`; ausente o desconocido → `artist`). Cada pestaña SHALL ser un enlace, y la activa
SHALL marcarse con `aria-current="page"`. Debajo de las pestañas SHALL mostrarse el formulario del tipo activo y, si hay
algún criterio, los resultados con la misma presentación que `/search`. Sin ningún criterio, la página SHALL mostrar solo
el formulario y SHALL NOT consultar MusicBrainz ni la base.

#### Scenario: Abrir la página
- **WHEN** una persona abre `/search/advanced`
- **THEN** ve la pestaña Artistas activa con su formulario vacío y ningún resultado

#### Scenario: Pestaña por URL
- **WHEN** una persona abre `/search/advanced?type=song&q=hallelujah`
- **THEN** ve la pestaña Canciones activa, el título prellenado con `hallelujah` y los resultados de canciones

### Requirement: Formulario por entidad que escribe la URL

Cada pestaña SHALL tener su propio formulario `GET` hacia `/search/advanced`, con los campos de su entidad y los botones
**Buscar** y **Limpiar**. Al buscar, la página SHALL navegar a una URL con solo los campos que tienen valor; los campos
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

La pestaña Artistas SHALL ofrecer: **Nombre** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Tipo** (cualquiera,
persona o grupo: `artistType`), **País** (uno o varios: `country`), **Ciudad o región** (`area`, lugar de nacimiento o
formación), **Año de inicio** desde/hasta (`beginFrom`, `beginTo`) y **Estado** (`ended=0` en actividad, `ended=1` ya
no). Cada campo SHALL aplicarse a las coincidencias locales y a la consulta a MusicBrainz.

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

### Requirement: Campos de Álbumes

La pestaña Álbumes SHALL ofrecer: **Título** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Artista** (`artist`) con
**¿Coincidencia exacta?** (`artistExact=1`), **Año** desde/hasta (`yearFrom`, `yearTo`) y **Tipo de lanzamiento** (una o
varias categorías: `category`). Cada campo SHALL aplicarse a las coincidencias locales y a la consulta a MusicBrainz.

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

La pestaña Canciones SHALL ofrecer: **Título** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Artista** (`artist`) con
**¿Coincidencia exacta?** (`artistExact=1`), **Álbum** (`album`) con **¿Coincidencia exacta?** (`albumExact=1`), **Tipo de
lanzamiento** (`category`, una o varias, sobre los álbumes donde aparece) y **Duración** mínima/máxima (`durMin`,
`durMax`). Con `artist`, la búsqueda SHALL tomar ese artista como intérprete sin detectar la interpretación. Sin título,
SHALL NOT aplicarse el filtro de relevancia del título.

#### Scenario: Canciones de un álbum
- **WHEN** una persona busca en Canciones con `artist=Jeff Buckley` y `album=Grace`, sin título
- **THEN** ve canciones de Jeff Buckley que aparecen en *Grace*, como *Hallelujah* y *Last Goodbye*

#### Scenario: Solo versiones de estudio
- **WHEN** una persona busca `hallelujah` en Canciones con `artist=Jeff Buckley` y `category=studio`
- **THEN** los grupos se forman con grabaciones que aparecen en discos de estudio

### Requirement: Nombre o título opcional

En las tres pestañas, `q` SHALL ser opcional: basta con cualquier otro campo con valor para buscar. Sin nombre ni título,
la consulta a MusicBrainz SHALL armarse solo con cláusulas de campo y las coincidencias locales SHALL pedirse solo por los
criterios. Sin ningún criterio, SHALL NOT buscarse.

#### Scenario: Solo país
- **WHEN** una persona busca en Artistas con `country=CL` y nada más
- **THEN** la página muestra artistas de Chile y ofrece "Cargar más"

#### Scenario: Sin criterios
- **WHEN** una persona abre `/search/advanced?type=album` sin ningún campo
- **THEN** la página muestra el formulario y ningún resultado, sin consultar MusicBrainz

### Requirement: Coincidencia exacta

Con la casilla de coincidencia exacta activa, un campo SHALL coincidir solo con nombres o títulos iguales al texto
normalizado (sin distinguir mayúsculas, acentos ni espacios extra). En Álbumes y Canciones, `artistExact` SHALL exigir que
algún artista principal acreditado se llame exactamente así. Sin la casilla, el campo coincide por palabras completas
(artista, álbum) o de forma tolerante (nombre, título), como en la búsqueda rápida.

#### Scenario: Artista exacto
- **WHEN** una persona busca en Álbumes con `artist=Queen` y `artistExact=1`
- **THEN** no ve discos de Queensrÿche ni de Queens of the Stone Age

### Requirement: Cambiar de pestaña conserva los campos equivalentes

Las pestañas SHALL enlazar a su tipo conservando solo los parámetros que significan lo mismo en el destino: `artist`,
`artistExact` y `category` entre Álbumes y Canciones. `q` SHALL NOT conservarse al cambiar de pestaña.

#### Scenario: De Canciones a Álbumes
- **WHEN** una persona en `/search/advanced?type=song&q=hallelujah&artist=Jeff%20Buckley&durMax=420` pulsa la pestaña
  Álbumes
- **THEN** la página navega a `/search/advanced?type=album&artist=Jeff+Buckley`

### Requirement: Lectura tolerante de los criterios

La página y el endpoint SHALL interpretar los criterios con un único lector. Un valor inválido (país que no son dos
letras, año fuera de 1000–2100 en Artistas o de 1900–2100 en Álbumes, duración fuera de 0–7200 s o que no es `m:ss`,
`ended` distinto de `0`/`1`, categoría desconocida, texto vacío o de más de 200 caracteres) SHALL ignorarse sin error.
Los países SHALL pasarse a mayúsculas. Las listas SHALL quedar sin repetidos y con como máximo 10 valores. Si en un rango
el desde es mayor que el hasta, SHALL intercambiarse. Un parámetro que no corresponde al tipo SHALL ignorarse. Una
bandera de coincidencia exacta sin su campo SHALL ignorarse.

#### Scenario: Valores mezclados
- **WHEN** una persona abre `/search/advanced?type=artist&country=cl&country=Chile&country=CL&beginFrom=1989&beginTo=1980`
- **THEN** la búsqueda usa `country=CL` una vez y el rango 1980–1989

#### Scenario: Exacto sin campo
- **WHEN** una persona abre `/search/advanced?type=album&artistExact=1&yearFrom=1983`
- **THEN** la búsqueda filtra por año y no exige ningún artista

### Requirement: Cada campo con el mismo criterio en las dos fuentes

Cada campo SHALL traducirse a una condición sobre la base local y a una cláusula de la consulta de MusicBrainz con el
mismo significado: `type`, `country`, `beginarea`, `begin` y `ended` en artistas; `releasegroup`, `artist`,
`firstreleasedate`, `primarytype` y `secondarytype` en release-groups; `recording`, `artist`, `release`, `primarytype`,
`secondarytype` y `dur` en recordings. Los textos SHALL escaparse para Lucene, y `area` SHALL ir sin acentos. Una fila sin
el dato que pide un campo SHALL NOT coincidir. En Artistas, la fila local y la de MusicBrainz SHALL fusionarse por `mbid`
antes de filtrar. Ningún campo SHALL sumar solicitudes a MusicBrainz más allá del presupuesto por tipo.

#### Scenario: Una sola solicitud sin nombre
- **WHEN** una persona busca en Artistas con `country=CL` y `beginFrom=1980` y la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz, con la consulta `country:(CL) AND begin:[1980 TO *]` sin
  texto libre

#### Scenario: Dato local faltante que MusicBrainz conoce
- **WHEN** un artista local sin ciudad coincide con un resultado de MusicBrainz formado en La Plata y el campo es
  `area=La Plata`
- **THEN** el artista aparece en los resultados

### Requirement: Barra de criterios con el formulario recogido

Con una búsqueda en curso, `/search/advanced` SHALL mostrar el formulario recogido en una barra con una pastilla por
criterio activo (un rango es una pastilla; cada país y cada tipo de lanzamiento, una) y un botón **Editar búsqueda** que
abre el formulario con los valores de la URL. Cada pastilla SHALL ser un enlace a la misma búsqueda sin ese criterio
(quitar un texto quita también su coincidencia exacta); quitar el último criterio SHALL llevar a la pestaña sin campos.
Sin búsqueda, el formulario SHALL verse abierto y sin barra. Una búsqueda nueva SHALL volver a recoger el formulario.

#### Scenario: Buscar recoge el formulario
- **WHEN** una persona busca grupos de Chile con inicio entre 1980 y 1989
- **THEN** ve la barra con "Grupo", "Chile" e "Inicio 1980–1989" y los resultados justo debajo, sin el formulario

#### Scenario: Quitar un criterio
- **WHEN** una persona pulsa la pastilla "Chile" en esa búsqueda
- **THEN** la página navega a la misma búsqueda sin `country=CL`

#### Scenario: Editar
- **WHEN** una persona pulsa **Editar búsqueda**
- **THEN** el formulario se abre con los campos de la búsqueda en curso

### Requirement: Encabezado de resultados de la búsqueda avanzada

El encabezado de resultados SHALL mostrar la cifra total con separador de miles y lo que se cuenta: "grupos" o "personas"
si se filtró por tipo de artista, "artistas" si no; "álbumes"; "canciones". SHALL NOT acotarse a "más de 1000" ni
repetirse en el aviso de búsqueda amplia.

#### Scenario: Cifra de grupos
- **WHEN** una búsqueda de grupos de Chile formados entre 1980 y 1989 da 53 resultados
- **THEN** el encabezado dice "53 grupos"

### Requirement: Sin coincidencias en la búsqueda avanzada

Sin resultados, la página SHALL ofrecer un enlace por criterio activo que lleva a la búsqueda sin ese criterio y, con 2 a
4 criterios, la cantidad de resultados que daría, que SHALL llegar sin retrasar el resto del estado. Con un nombre o
título, SHALL ofrecer la misma búsqueda en `/search`, que tolera errores de escritura. Con un único criterio SHALL
ofrecer **Limpiar**.

#### Scenario: Nombre inexistente con país
- **WHEN** una persona busca en Artistas el nombre `zzqxv blorp` con Chile y no hay resultados
- **THEN** ve "Sin «zzqxv blorp»" y "Sin Chile" con sus cifras y "Buscar «zzqxv blorp» en la búsqueda rápida"

### Requirement: Búsqueda amplia sugiere campos

Sin nombre ni título y con más de 500 resultados, la página SHALL avisar que solo se muestran los primeros y SHALL sugerir
hasta tres campos sin valor que acotan el tipo (Artistas: país, año de inicio, tipo; Álbumes: año de lanzamiento,
artista; Canciones: artista, álbum, duración). Cada sugerencia SHALL abrir el formulario con el foco en ese campo.

#### Scenario: Solo directos
- **WHEN** una persona busca en Álbumes solo "Directos y otros"
- **THEN** ve "14.514 álbumes", el aviso con "Año de lanzamiento" y "Artista", y al pulsar "Año de lanzamiento" el
  formulario se abre con el foco en "desde"

### Requirement: Canciones sin título en lista simple

En la pestaña Canciones sin título, los resultados SHALL mostrarse como una lista simple de canciones, sin el bloque de
mejor coincidencia con los álbumes de la primera.

#### Scenario: Canciones largas de un artista
- **WHEN** una persona busca canciones de Radiohead de 7:00 o más, sin título
- **THEN** ve la lista de canciones, sin "Álbumes que contienen…"

### Requirement: Formulario agrupado

El formulario de cada pestaña SHALL agrupar sus campos en conjuntos con nombre: Artistas en **Identidad** (nombre, tipo),
**Origen** (país, ciudad o región) y **Época** (año de inicio, estado); Álbumes en **Identidad** (título, artista) y
**Lanzamiento** (año, tipo); Canciones en **Identidad** (título, artista, álbum) y **Lanzamiento** (tipo, duración). Los
campos de texto, selectores y el selector de países SHALL tener el mismo alto y tipografía; la casilla de coincidencia
exacta SHALL ir debajo de su campo; la etiqueta SHALL ir arriba y la ayuda debajo del control, de modo que los controles
de una misma fila queden alineados. En los rangos, "desde" y "hasta" SHALL ir en el texto de ejemplo de cada control.

#### Scenario: Grupos de Artistas
- **WHEN** una persona abre la pestaña Artistas
- **THEN** ve los grupos Identidad, Origen y Época, y el campo Nombre del mismo ancho que Tipo

### Requirement: Envío fijo en móvil con cantidad de criterios

La fila de envío SHALL mostrar cuántos criterios tiene el formulario, contados como en la barra de criterios, y SHALL
actualizarse al cambiar cualquier campo. En pantallas angostas SHALL quedar fija al pie de la pantalla mientras el
formulario está visible.

#### Scenario: Contar criterios
- **WHEN** una persona en Artistas elige Grupo, agrega Chile y escribe 1980 en "desde"
- **THEN** la fila de envío dice "3 criterios"

### Requirement: Validación en español

Con JavaScript, el formulario SHALL validar antes de navegar: los años SHALL tener 4 dígitos dentro del rango del campo,
"desde" SHALL NOT ser posterior a "hasta" y la duración SHALL escribirse como `m:ss` o minutos. Con un error, SHALL NOT
navegar: SHALL mostrar el mensaje bajo el grupo del campo, marcarlo con `aria-invalid` y enfocar el primer campo con
error. Sin JavaScript SHALL conservarse la validación del navegador.

#### Scenario: Rango invertido
- **WHEN** una persona escribe 1990 en "desde" y 1980 en "hasta" del año de inicio y pulsa Buscar
- **THEN** la página no navega y ve "«Desde» no puede ser posterior a «Hasta»" bajo el año de inicio

### Requirement: Aviso de valores ignorados

Si la URL trae, para un campo del tipo activo, un valor que la búsqueda no reconoce, la página SHALL avisar qué
`campo=valor` se ignoró, además de buscar con el resto.

#### Scenario: Tipo de lanzamiento desconocido
- **WHEN** una persona abre `/search/advanced?type=album&category=live&yearFrom=1994`
- **THEN** ve el aviso con `category=live` y los resultados de 1994

### Requirement: Ejemplos y búsquedas recientes sin campos

Sin campos, debajo del formulario la página SHALL ofrecer tres ejemplos de la pestaña activa, cada uno con su título y sus
criterios, que llevan a esa búsqueda, y las últimas búsquedas avanzadas mostradas en ese navegador (hasta 5, sin repetir,
cada una con su pestaña y sus criterios), con opción de quitarlas. Las recientes SHALL guardarse solo en el navegador y
la página SHALL funcionar si el almacenamiento no está disponible.

#### Scenario: Ejemplo de Artistas
- **WHEN** una persona abre `/search/advanced` y pulsa "Bandas chilenas de los 80"
- **THEN** la página busca grupos de Chile con inicio entre 1980 y 1989

#### Scenario: Reciente
- **WHEN** una persona buscó grupos de Chile y vuelve a `/search/advanced`
- **THEN** ve esa búsqueda entre las recientes con "Grupo · Chile"

### Requirement: Datos filtrados destacados

En `/search/advanced`, cada fila de resultados SHALL destacar los datos que la búsqueda filtró: en Artistas, el tipo, el
país, la ciudad o región y los años (con un filtro de año de inicio o de estado); en Álbumes, el artista, el tipo y el
año de lanzamiento; en Canciones, el artista, el álbum y la duración. `/search` SHALL NOT destacar nada.

#### Scenario: Grupos de Chile de los 80
- **WHEN** una persona busca grupos de Chile con inicio entre 1980 y 1989
- **THEN** en cada fila "Grupo", "Chile" y los años se ven destacados

### Requirement: Vista Tabla de los resultados

Con resultados y en pantallas anchas, `/search/advanced` SHALL ofrecer las vistas **Lista** (por defecto) y **Tabla**. La
tabla SHALL tener una fila por resultado y estas columnas: Artistas: Nombre, Tipo, País, Ciudad o región, Años, Discos;
Álbumes: Título, Artista, Tipo, Año, Media, Tú; Canciones: Título, Artista, Duración. Las columnas de los criterios de la
búsqueda SHALL marcarse. La elección SHALL recordarse en el navegador y la página SHALL funcionar si el almacenamiento no
está disponible. "Cargar más" SHALL agregar los resultados en la misma vista. En pantallas angostas SHALL verse siempre
la lista. La tabla SHALL NOT ordenarse por columna.

#### Scenario: Elegir Tabla
- **WHEN** una persona elige Tabla en una búsqueda de álbumes de Pink Floyd de los 70 y luego busca otra cosa
- **THEN** ve la tabla con las columnas Artista, Tipo y Año marcadas, y la búsqueda nueva también en Tabla

#### Scenario: Teléfono
- **WHEN** una persona que eligió Tabla abre la búsqueda en un teléfono
- **THEN** ve la lista

