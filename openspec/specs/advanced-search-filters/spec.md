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

