## MODIFIED Requirements

### Requirement: Sin coincidencias es una lista vacía, no un error

Cuando ni la base local ni MusicBrainz devuelven coincidencias para el texto en el tipo pedido,
el endpoint SHALL responder `200` con una lista vacía y la página SHALL mostrar un estado vacío
que ofrezca buscar el mismo texto en los otros tipos. El estado vacío SHALL decir qué no coincidió
("Nada coincide con «x» en álbumes"), dar consejos (ortografía, menos palabras; en Álbumes y Canciones, «Artista - Título»),
enlazar a la búsqueda avanzada del tipo (salvo en Usuarios) y, si el catálogo propio tiene un nombre o un
título parecido (similitud de trigramas ≥ 0,45, sin consultar MusicBrainz), ofrecer primero "¿Quisiste decir …?"
con la misma búsqueda sobre ese texto. En la búsqueda rápida, el estado vacío SHALL mostrar además, por cada otro tipo de
catálogo con coincidencias **en la base propia** (sin solicitudes a MusicBrainz), hasta tres de ellas con un enlace a esa
búsqueda. Los tipos sin coincidencias locales, y Usuarios, SHALL quedar como accesos simples. También SHALL ofrecer "O empieza
por aquí" con Explorar, Lanzamientos y Listas, y SHALL mostrar en la columna lateral las búsquedas recientes del navegador,
si las hay. La misma sugerencia "¿Quisiste decir …?" SHALL mostrarse sobre una lista "débil", en la que
ningún resultado cubre todas las palabras de la consulta (MusicBrainz devuelve coincidencias parciales para un error
de tipeo en lugar de una lista vacía). Sin resultados y sin filtro activo, las pastillas de filtro SHALL NOT
mostrarse. Con un filtro activo (tipo de artista, categoría o década), el estado vacío SHALL decir que no hay
nada con esos filtros y ofrecer "Quitar filtros", sin sugerencias. El endpoint SHALL NOT responder `404` ni
emitir `ARTIST_NOT_FOUND` para una búsqueda sin resultados.

#### Scenario: Texto sin coincidencias
- **WHEN** una persona busca una cadena que no corresponde a ningún artista
- **THEN** el endpoint responde `200` con `{ "type": "artist", "results": [] }` y la página
  ofrece buscar el texto en Álbumes, Canciones y Usuarios

#### Scenario: Error de tipeo

- **WHEN** una persona busca `pink floid` en Álbumes y MusicBrainz solo devuelve discos llamados "Pink" de otros
  artistas
- **THEN** sobre la lista aparece "¿Quisiste decir Pink Floyd?" con un enlace a esa búsqueda

#### Scenario: Sin coincidencias

- **WHEN** una persona busca `xqzvqzzq` en Álbumes y nada coincide
- **THEN** el estado vacío dice "Nada coincide con «xqzvqzzq» en álbumes", da consejos, ofrece los otros tipos, la
  búsqueda avanzada y "O empieza por aquí", y no muestra pastillas de filtro

#### Scenario: Filtro que vacía la lista

- **WHEN** una persona busca `the wall` en Álbumes con la década 1960s y nada coincide
- **THEN** el estado vacío dice "Nada con estos filtros" y ofrece "Quitar filtros" hacia la misma búsqueda sin ellos

#### Scenario: Coincidencias en otro tipo

- **WHEN** una persona busca en Álbumes el título de una canción que no es título de ningún disco, y la base propia tiene
  esa canción
- **THEN** el estado vacío muestra "En canciones" con la canción y "Ver canciones →", sin solicitudes a MusicBrainz

#### Scenario: Búsquedas recientes
- **WHEN** una persona que ya buscó en este navegador llega a una búsqueda sin resultados en escritorio
- **THEN** la columna lateral muestra sus búsquedas recientes

### Requirement: Ficha de respuesta en Álbumes

En la búsqueda rápida de Álbumes, cuando el primer resultado cubre la consulta (su título es la consulta, o la consulta es
artista + título), la página SHALL mostrarlo en una ficha: carátula en miniatura de 250 px (nunca a resolución completa),
título, artista, categoría y año, la media de la comunidad en forma compacta si la hay, y "Ver el disco". Si el disco
tiene una edición representativa ya guardada en la base propia, la ficha SHALL mostrar sus primeras 6 canciones y cuántas
más tiene. La búsqueda SHALL NOT ingerir la tracklist para mostrarla. Si la lista trae otros discos del mismo artista con
el mismo título, la ficha SHALL enlazarlos ("También: Single · 2023") y SHALL NOT repetirlos debajo. El resto de
resultados SHALL ir debajo: si son al menos 4 y la mitad o más se llama igual que la consulta, en una rejilla de carátulas
bajo "Otros discos llamados «x»", con el artista como titular, categoría y año, y el menú de acciones del disco; si no, en
filas bajo "Otros álbumes". "Cargar más" SHALL agregar en la misma vista. Sin un primer resultado que cubra la consulta no
hay ficha; tampoco cuando la consulta es solo el nombre del artista del primer disco.

#### Scenario: The Wall
- **WHEN** una persona busca `the wall` en Álbumes
- **THEN** ve la ficha de "The Wall" de Pink Floyd (De estudio · 1979) con "Ver el disco" y "También: Singles y EPs · 2023",
  y debajo "Otros discos llamados «the wall»" en una rejilla de carátulas con ARTY, buzzG, Ember Falls… como titulares

#### Scenario: Títulos distintos
- **WHEN** una persona busca `ok computer` en Álbumes y la mayoría de los otros discos se llaman distinto ("OK Computer
  Turns 10", tributos)
- **THEN** debajo de la ficha van en filas bajo "Otros álbumes"

#### Scenario: Cargar más en la rejilla
- **WHEN** la rejilla de "the wall" tiene más páginas y la persona pulsa "Cargar más"
- **THEN** las tarjetas nuevas se agregan a la misma rejilla

#### Scenario: Tracklist guardada
- **WHEN** el disco de la ficha ya tiene su edición representativa con canciones en la base propia
- **THEN** la ficha muestra las 6 primeras y "y N más", sin solicitudes a MusicBrainz

#### Scenario: Tracklist no guardada
- **WHEN** el disco de la ficha no tiene canciones guardadas
- **THEN** la ficha se muestra sin canciones y la búsqueda no las ingiere

#### Scenario: Solo el nombre del artista
- **WHEN** una persona busca `paranoid android` en Álbumes y el primer resultado es un disco del grupo Paranoid Android con
  otro título
- **THEN** no hay ficha: la consulta no nombra un disco

#### Scenario: Consulta que no es un título
- **WHEN** una persona busca `pink floid` en Álbumes y ningún título cubre la consulta
- **THEN** no hay ficha y la lista se muestra como antes

## ADDED Requirements

### Requirement: Canciones con el mismo título

En la búsqueda rápida de Canciones, una fila de "Otras canciones con ese título" cuyo título es igual a la consulta SHALL
mostrar el artista como titular y el título en la línea de datos, con la duración a la derecha. Las filas con otro título
SHALL conservar el título como titular. La búsqueda avanzada SHALL NOT cambiar.

#### Scenario: Creep
- **WHEN** una persona busca `creep` en Canciones
- **THEN** las otras canciones se leen "Lena Hall" / "Creep · 3:38", "The Piano Tribute Players" / "Creep · 3:40"…, en vez
  de 25 filas tituladas "Creep"
