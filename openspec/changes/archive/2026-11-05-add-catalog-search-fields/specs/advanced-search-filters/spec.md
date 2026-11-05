## MODIFIED Requirements

### Requirement: Campos de Artistas

La pestaña Artistas SHALL ofrecer: **Nombre** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Tipo** (cualquiera,
persona o grupo: `artistType`), **País** (uno o varios: `country`), **Ciudad o región** (`area`, lugar de nacimiento o
formación), **Año de nacimiento o formación** desde/hasta (`beginFrom`, `beginTo`) y **Estado** (`ended=0` en actividad,
`ended=1` ya no). La etiqueta del año SHALL seguir al tipo elegido: "Año de nacimiento" con Persona, "Año de formación"
con Grupo y "Año de nacimiento o formación" sin tipo, con el mismo parámetro y el mismo criterio. Cada uno de estos
campos SHALL aplicarse a las coincidencias locales y a la consulta a MusicBrainz. Además SHALL ofrecer los campos del
catálogo de "Período de actividad", "Rol de una persona", "Género" y "Premios".

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
- **WHEN** una persona elige Persona en el campo Tipo
- **THEN** el campo de año se llama "Año de nacimiento", y al elegir Grupo pasa a "Año de formación", sin recargar la
  página

### Requirement: Campos de Álbumes

La pestaña Álbumes SHALL ofrecer: **Título** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Artista** (`artist`) con
**¿Coincidencia exacta?** (`artistExact=1`), **Año** desde/hasta (`yearFrom`, `yearTo`) y **Tipo de lanzamiento** (una o
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

### Requirement: Cada campo con el mismo criterio en las dos fuentes

Cada campo que no es del catálogo SHALL traducirse a una condición sobre la base local y a una cláusula de la consulta de
MusicBrainz con el mismo significado: `type`, `country`, `beginarea`, `begin` y `ended` en artistas; `releasegroup`,
`artist`, `firstreleasedate`, `primarytype` y `secondarytype` en release-groups; `recording`, `artist`, `release`,
`primarytype`, `secondarytype` y `dur` en recordings. Los textos SHALL escaparse para Lucene, y `area` SHALL ir sin
acentos. Una fila sin el dato que pide un campo SHALL NOT coincidir. En Artistas, la fila local y la de MusicBrainz SHALL
fusionarse por `mbid` antes de filtrar. Ningún campo SHALL sumar solicitudes a MusicBrainz más allá del presupuesto por
tipo. Los campos del catálogo (`activeFrom`, `activeTo`, `role`, `genre`, `award`, `awardWon`, `artistCountry`) no tienen
cláusula en MusicBrainz: con alguno de ellos, la búsqueda SHALL seguir "Modo solo catálogo".

#### Scenario: Una sola solicitud sin nombre
- **WHEN** una persona busca en Artistas con `country=CL` y `beginFrom=1980` y la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz, con la consulta `country:(CL) AND begin:[1980 TO *]` sin
  texto libre

#### Scenario: Dato local faltante que MusicBrainz conoce
- **WHEN** un artista local sin ciudad coincide con un resultado de MusicBrainz formado en La Plata y el campo es
  `area=La Plata`
- **THEN** el artista aparece en los resultados

#### Scenario: Campo del catálogo sin MusicBrainz
- **WHEN** una persona busca en Artistas con `country=CL` y `genre=rock`
- **THEN** no se emite ninguna solicitud a MusicBrainz y los resultados salen de la base propia

### Requirement: Cambiar de pestaña conserva los campos equivalentes

Las pestañas SHALL enlazar a su tipo conservando solo los parámetros que significan lo mismo en el destino: `artist`,
`artistExact` y `category` entre Álbumes y Canciones; `genre`, `award` y `awardWon` entre Artistas y Álbumes. `q` SHALL
NOT conservarse al cambiar de pestaña.

#### Scenario: De Canciones a Álbumes
- **WHEN** una persona en `/search/advanced?type=song&q=hallelujah&artist=Jeff%20Buckley&durMax=420` pulsa la pestaña
  Álbumes
- **THEN** la página navega a `/search/advanced?type=album&artist=Jeff+Buckley`

#### Scenario: De Artistas a Álbumes con género
- **WHEN** una persona en `/search/advanced?type=artist&country=CL&genre=rock&award=any` pulsa la pestaña Álbumes
- **THEN** la página navega a `/search/advanced?type=album&genre=rock&award=any`

### Requirement: Formulario agrupado

El formulario de cada pestaña SHALL agrupar sus campos en conjuntos con nombre: Artistas en **Identidad** (nombre, tipo,
rol), **Origen** (país, ciudad o región), **Época** (año de nacimiento o formación, estado) y **Del catálogo** (activo
entre, género, premios); Álbumes en **Identidad** (título, artista), **Lanzamiento** (año, tipo) y **Del catálogo**
(género, país del artista, premios); Canciones en **Identidad** (título, artista, álbum) y **Lanzamiento** (tipo,
duración). El grupo **Del catálogo** SHALL llevar una ayuda que diga que esos campos buscan solo en lo que ya está en el
catálogo. Los campos de texto, selectores y el selector de países SHALL tener el mismo alto y tipografía; la casilla de
coincidencia exacta SHALL ir debajo de su campo; la etiqueta SHALL ir arriba y la ayuda debajo del control, de modo que
los controles de una misma fila queden alineados. En los rangos, "desde" y "hasta" SHALL ir en el texto de ejemplo de
cada control.

#### Scenario: Grupos de Artistas
- **WHEN** una persona abre la pestaña Artistas
- **THEN** ve los grupos Identidad, Origen, Época y Del catálogo, y el campo Nombre del mismo ancho que Tipo

#### Scenario: Ayuda del grupo del catálogo
- **WHEN** una persona abre la pestaña Álbumes
- **THEN** ve el grupo Del catálogo con Género, País del artista y Premios, y la ayuda que explica que no buscan en
  MusicBrainz

## ADDED Requirements

### Requirement: Modo solo catálogo

Si la búsqueda tiene algún campo del catálogo, SHALL resolverse solo con la base propia, con todos sus criterios (también
los que tienen cláusula en MusicBrainz) aplicados en SQL, sin solicitudes a MusicBrainz ni stubs nuevos. Los resultados
SHALL tener un orden estable (con nombre o título, por nivel de coincidencia y similitud; sin él, Artistas primero los de
discografía explorada y luego por nombre, Álbumes como sin texto), la cifra total exacta y "Cargar más" de 25 en 25. El encabezado
de resultados SHALL avisar "Solo artistas del catálogo" o "Solo álbumes del catálogo", con una explicación de que no se
consultó MusicBrainz. Cada página SHALL resolverse en 150 ms o menos (mediana, base de scratch).

#### Scenario: Aviso
- **WHEN** una persona busca álbumes de rock de Chile
- **THEN** la página dice "Solo álbumes del catálogo" y no se consultó MusicBrainz

#### Scenario: Cargar más
- **WHEN** una búsqueda solo del catálogo tiene 80 resultados
- **THEN** la página muestra 25, la cifra 80 y "Cargar más", que agrega los siguientes 25 sin repetir

#### Scenario: Sin campos del catálogo no cambia
- **WHEN** una persona busca grupos de Chile formados entre 1980 y 1989
- **THEN** la búsqueda consulta MusicBrainz como siempre y no aparece el aviso

### Requirement: Período de actividad

En Artistas, **Activo entre** desde/hasta (`activeFrom`, `activeTo`, años de 1900 a 2100) SHALL coincidir con los
artistas cuyo período de actividad se solapa con ese rango. El período SHALL ser del año del primer al último disco con
el artista como principal, y SHALL llegar hasta el año en curso si el artista no consta como separado o fallecido. Solo
los artistas con la discografía explorada SHALL tener período: los demás SHALL NOT coincidir. Las filas SHALL mostrar el
período ("Activo desde 2006", o "Activo 1979–1999" si terminó) y destacarlo; la vista Tabla SHALL sumar la columna
"Activo".

#### Scenario: Activos en los 80, no nacidos en los 80
- **WHEN** una persona busca Persona, Chile, activo entre 1980 y 1990
- **THEN** no ve a Javiera Mena (nacida en 1983, primer disco en 2006)

#### Scenario: Sigue en actividad
- **WHEN** una persona busca artistas activos entre 2020 y 2025 y un grupo publicó su último disco en 2015 pero no consta
  como separado
- **THEN** el grupo aparece, con el período hasta hoy

#### Scenario: Discografía sin explorar
- **WHEN** un artista del catálogo nunca tuvo su discografía explorada
- **THEN** no aparece en una búsqueda por actividad

### Requirement: Rol de una persona

En Artistas, con Tipo Persona, **Rol** (`role`) SHALL ofrecer: Cualquiera (sin parámetro), **Con discografía propia**
(`own`: algún disco como artista principal), **Integrante de una banda** (`member`), **Producción o técnica**
(`producer`: créditos de personal de producción, ingeniería, mezcla, grabación, programación o arreglos) y **Músico en
discos de otros** (`musician`: créditos de instrumento o voz en discos donde no es artista principal). Sin Tipo Persona,
`role` SHALL ignorarse, y el formulario SHALL mostrar Rol solo con Persona.

#### Scenario: Solo con discos propios
- **WHEN** una persona busca Persona, Chile, Con discografía propia
- **THEN** no ve integrantes de bandas que no tienen discos a su nombre

#### Scenario: Buscar al productor
- **WHEN** una persona busca Persona con Producción o técnica y el nombre de un productor del catálogo sin discos propios
- **THEN** lo ve en los resultados, y con Con discografía propia no

#### Scenario: Rol sin persona
- **WHEN** una persona abre `/search/advanced?type=artist&artistType=group&role=member`
- **THEN** la búsqueda ignora el rol y sigue el modo habitual

### Requirement: Integrante de una banda en los resultados

En los resultados de Artistas (en `/search` y en `/search/advanced`, con o sin campos del catálogo), una persona que es
integrante de alguna banda del catálogo SHALL mostrar "Integrante de <banda>", con la banda de más actividad y "y N más"
si son varias. SHALL resolverse con una lectura por página y SHALL NOT cambiar el orden ni el filtrado.

#### Scenario: Integrante en una búsqueda sin rol
- **WHEN** una persona busca `Dave Grohl` en Artistas, sin rol
- **THEN** su fila dice "Integrante de" con una de sus bandas y cuántas más tiene en el catálogo

### Requirement: Género

En Artistas y Álbumes, **Género** (`genre`, el slug de un género visible de la taxonomía propia) SHALL coincidir con ese
género y sus subgéneros: en Álbumes, por el género efectivo del álbum (votos, semillas y herencia); en Artistas, por la
semilla del artista o por algún disco propio con ese género efectivo. El selector SHALL ser el buscador de géneros, con
un valor. Un slug desconocido u oculto SHALL ignorarse. Nunca se usan géneros ni tags de MusicBrainz.

#### Scenario: Subgéneros incluidos
- **WHEN** una persona busca álbumes con `genre=rock`
- **THEN** ve también álbumes de rock alternativo y de rock progresivo

#### Scenario: Slug inexistente
- **WHEN** una persona abre `/search/advanced?type=album&genre=zzz&yearFrom=1990`
- **THEN** la búsqueda ignora el género y filtra solo por año, con MusicBrainz

### Requirement: Premios

En Artistas y Álbumes, **Premios** (`award`: `any` o el slug de un premio o salón de la fama) SHALL coincidir con lo
nominado a ese premio, y con `awardWon=1` solo con lo que lo ganó (una entrada a un salón de la fama cuenta como
ganada). En Álbumes cuenta la nominación del álbum o de una grabación anclada en él; en Artistas, la del artista o la de
un álbum o grabación donde es artista principal. El selector SHALL listar los premios cargados. `awardWon` sin `award`
SHALL ignorarse.

#### Scenario: Ganadores del Grammy
- **WHEN** una persona busca álbumes con `award=grammy` y `awardWon=1`
- **THEN** ve solo álbumes que ganaron algún Grammy

#### Scenario: Cualquier premio
- **WHEN** una persona busca artistas de Reino Unido con `award=any`
- **THEN** ve artistas británicos con alguna nominación a cualquier premio del catálogo

### Requirement: País del artista en Álbumes

En Álbumes, **País del artista** (`artistCountry`, uno o varios códigos ISO 3166-1 alfa-2) SHALL coincidir con los
álbumes donde algún artista principal acreditado es de uno de esos países.

#### Scenario: Álbumes chilenos de los 90
- **WHEN** una persona busca álbumes con `artistCountry=CL`, `yearFrom=1990` y `yearTo=1999`
- **THEN** ve álbumes de artistas chilenos de esa década, como *Corazones* de Los Prisioneros

### Requirement: Campos del catálogo en la barra, el estado vacío y la tabla

Cada campo del catálogo SHALL tener su pastilla en la barra de criterios ("Activo 1980–1990", "Con discografía propia",
"Rock y subgéneros", "Grammy · ganador", una por país del artista) que se quita como las demás, y SHALL contarse en el
envío fijo en móvil. Sin resultados, el estado vacío SHALL ofrecer "Sin <campo>" también para los campos del catálogo, y
la cifra de esa búsqueda sin el campo. Las filas SHALL destacar el género y el país del artista filtrados en Álbumes.

#### Scenario: Quitar el género
- **WHEN** una persona pulsa la pastilla "Rock y subgéneros" en una búsqueda de álbumes de rock de Chile
- **THEN** la página navega a la misma búsqueda sin `genre`
