## ADDED Requirements

### Requirement: Botón y panel de filtros en la página de resultados

`/search` SHALL mostrar, a la derecha del campo de búsqueda, un botón **Filtros** para los tipos Artistas, Álbumes y
Canciones. El botón SHALL indicar el número de filtros del panel que están activos ("Filtros · 2") y SHALL abrir y
cerrar, debajo del campo, un panel con los campos del tipo activo. El botón SHALL anunciar su estado con
`aria-expanded` y su relación con el panel con `aria-controls`. El panel SHALL abrirse de entrada cuando la URL trae
`filters=1` o algún filtro del panel activo. En el tipo Usuarios el botón SHALL NOT mostrarse. El Header SHALL NOT
tener un botón de filtros.

#### Scenario: Abrir el panel
- **WHEN** una persona en `/search?type=album&q=maiden` pulsa **Filtros**
- **THEN** debajo del campo se despliega el panel con Años desde/hasta y Artista, y el botón queda con
  `aria-expanded="true"`

#### Scenario: Contador de filtros activos
- **WHEN** una persona abre `/search?type=artist&q=sumo&country=AR&beginFrom=1980`
- **THEN** el botón dice "Filtros · 2" y el panel aparece abierto con esos valores

#### Scenario: Usuarios sin filtros
- **WHEN** una persona abre `/search?type=user&q=ana`
- **THEN** no hay botón **Filtros**

### Requirement: Formulario de filtros que escribe la URL

El panel SHALL ser un formulario `GET` hacia `/search` que conserva `type` y `q`. Al aplicarlo, la página SHALL
navegar a una URL con solo los filtros que tienen valor; los campos vacíos SHALL NOT aparecer en la URL. Sin
JavaScript el formulario SHALL seguir funcionando, y el servidor SHALL tratar un parámetro vacío como ausente. El
resultado filtrado SHALL poder abrirse desde un enlace y "atrás" SHALL volver a la búsqueda anterior.

#### Scenario: Aplicar filtros
- **WHEN** una persona busca `sumo` en Artistas, elige país Argentina, deja vacío el inicio de actividad y aplica
- **THEN** la página navega a `/search?type=artist&q=sumo&country=AR`

#### Scenario: Enlace compartido
- **WHEN** otra persona abre `/search?type=album&q=maiden&yearFrom=1983&yearTo=1986`
- **THEN** ve los mismos resultados filtrados, con el panel abierto con esos valores

#### Scenario: Sin JavaScript
- **WHEN** el formulario se envía sin JavaScript con `country=` y `beginFrom=` vacíos
- **THEN** la página busca como si esos parámetros no estuvieran

### Requirement: Filtros de Artistas

En Artistas, el panel SHALL ofrecer **País** (`country`, código ISO de dos letras, elegido de una lista con nombres
en el idioma de la persona), **Inicio de actividad** desde/hasta (`beginFrom`, `beginTo`, años; nacimiento en una
persona, formación en un grupo) y **Estado** (`ended=0` en actividad, `ended=1` ya no en actividad). Cada filtro
SHALL aplicarse tanto a las coincidencias locales como a la consulta a MusicBrainz, con el mismo criterio. El filtro
Persona/Grupo existente se mantiene.

#### Scenario: Bandas argentinas de los 80
- **WHEN** una persona busca `soda` en Artistas con `country=AR`, `beginFrom=1980` y `beginTo=1989`
- **THEN** ve Soda Stereo y no ve artistas de otros países ni de otras épocas

#### Scenario: Ya no en actividad
- **WHEN** una persona busca `nirvana` en Artistas con `ended=1`
- **THEN** solo ve artistas cuya actividad terminó

#### Scenario: Dato local faltante que MusicBrainz conoce
- **WHEN** un artista local sin país coincide con un resultado de MusicBrainz de país `AR` y el filtro es `country=AR`
- **THEN** el artista aparece en los resultados

### Requirement: Filtros de Álbumes

En Álbumes, el panel SHALL ofrecer **Años** desde/hasta (`yearFrom`, `yearTo`) sobre el año del primer lanzamiento y
**Artista** (`artist`, texto) sobre el artista principal acreditado. Los dos SHALL aplicarse a las coincidencias
locales y a la consulta a MusicBrainz. Un rango con un solo extremo SHALL valer como abierto del otro lado. Con un
rango de años activo, la década SHALL ignorarse y ninguna pastilla de década SHALL verse activa. Aplicar el panel
SHALL quitar `decade` de la URL, y elegir una pastilla de década SHALL quitar `yearFrom` y `yearTo`. Los filtros de
categoría y década existentes se mantienen.

#### Scenario: Discos de un período
- **WHEN** una persona busca `iron maiden` en Álbumes con `yearFrom=1983` y `yearTo=1986`
- **THEN** ve *Piece of Mind*, *Powerslave* y *Somewhere in Time*, y no *The Number of the Beast*

#### Scenario: Título común con artista
- **WHEN** una persona busca `greatest hits` en Álbumes con `artist=queen`
- **THEN** solo ve recopilaciones acreditadas a Queen

#### Scenario: El rango gana a la década
- **WHEN** una persona abre `/search?type=album&q=kiss&decade=1970&yearFrom=1980`
- **THEN** la búsqueda filtra desde 1980, ninguna pastilla de década aparece activa y el chip dice "Desde 1980"

### Requirement: Filtros de Canciones

En Canciones, el panel SHALL ofrecer **Artista** (`artist`, texto) y **Duración** mínima/máxima (`durMin`, `durMax`,
en segundos en la URL y en `m:ss` en el panel). Con `artist`, la búsqueda SHALL tomar el texto completo como título y
ese artista como intérprete, sin detectar la interpretación. La duración SHALL filtrar cada grabación (local y de
MusicBrainz) antes de agruparlas; una grabación sin duración conocida SHALL NOT pasar el filtro, y un grupo sin ninguna
grabación que lo pase SHALL NOT aparecer. Sin JavaScript el panel envía la duración como `m:ss`, que la URL también
acepta; un número sin `:` son segundos.

#### Scenario: Versión de un intérprete
- **WHEN** una persona busca `hallelujah` en Canciones con `artist=jeff buckley`
- **THEN** ve el grupo *Hallelujah* de Jeff Buckley primero, sin que el texto se interprete como artista

#### Scenario: Corte por duración
- **WHEN** una persona busca `hallelujah` en Canciones con `durMax=420`
- **THEN** solo ve grupos formados por grabaciones que duran 7:00 o menos

### Requirement: Validación tolerante de los filtros

La página y el endpoint SHALL interpretar los filtros con un único lector. Un valor inválido (país que no son dos
letras, año fuera de 1000–2100 en Artistas o de 1900–2100 en Álbumes, duración fuera de 0–7200 s, `ended` distinto
de `0`/`1`, `artist` vacío o de más de 200 caracteres) SHALL ignorarse sin error. Un país en minúsculas SHALL
pasarse a mayúsculas. Si en un rango el desde es mayor que el hasta, SHALL intercambiarse. Un filtro que no
corresponde al tipo activo SHALL ignorarse.

#### Scenario: Rango invertido
- **WHEN** una persona abre `/search?type=album&q=maiden&yearFrom=1986&yearTo=1983`
- **THEN** la búsqueda filtra de 1983 a 1986

#### Scenario: Filtro de otro tipo
- **WHEN** una persona abre `/search?type=album&q=maiden&country=GB`
- **THEN** `country` se ignora y no cuenta como filtro activo

#### Scenario: Valor inválido
- **WHEN** una persona abre `/search?type=artist&q=sumo&country=Argentina`
- **THEN** la búsqueda corre sin filtro de país

### Requirement: Mismo criterio en la base local y en MusicBrainz

Cada filtro SHALL traducirse a una condición sobre la base local y a una cláusula de la consulta de MusicBrainz con
el mismo significado: `country`, `begin` y `ended` en artistas; `firstreleasedate` y `artist` en release-groups;
`artist` y `dur` en recordings. Los valores de texto SHALL escaparse para Lucene. Una fila sin el dato que el filtro
pide SHALL NOT coincidir. Los filtros SHALL NOT sumar solicitudes a MusicBrainz más allá del presupuesto por tipo;
con `artist` en Canciones SHALL omitirse la búsqueda de artistas que detecta la interpretación.

#### Scenario: Una sola solicitud con filtros
- **WHEN** una persona busca `soda` en Artistas con `country=AR` y la caché fría
- **THEN** se emite exactamente una solicitud a MusicBrainz, cuya consulta incluye `country:AR`

#### Scenario: Artista explícito ahorra la detección
- **WHEN** una persona busca `hallelujah` en Canciones con `artist=jeff buckley` y la caché fría
- **THEN** no se emite ninguna búsqueda de artistas y se emite una sola búsqueda de recordings

#### Scenario: Texto con caracteres de Lucene
- **WHEN** una persona busca en Álbumes con `artist=AC/DC`
- **THEN** la consulta a MusicBrainz lleva el artista escapado y la búsqueda no falla

### Requirement: Chips de filtros activos

Con algún filtro del panel activo, la página SHALL mostrar debajo del resumen de resultados un chip por filtro ("País:
Argentina", "1983–1986", "Artista: Queen", "Hasta 7:00"), cada uno con un enlace que lo quita y conserva el resto, y
un enlace **Quitar filtros** que vuelve a `/search?type=<tipo>&q=<texto>`. Persona/Grupo, categoría y década siguen
en sus pastillas y SHALL NOT repetirse como chips. Con filtros activos y sin resultados, el estado vacío SHALL
ofrecer **Quitar filtros** además de los accesos a otros tipos. "Cargar más" SHALL conservar los filtros.

#### Scenario: Quitar un filtro
- **WHEN** una persona en `/search?type=artist&q=sumo&country=AR&ended=1` pulsa la × del chip "Ya no en actividad"
- **THEN** la página navega a `/search?type=artist&q=sumo&country=AR`

#### Scenario: Sin resultados con filtros
- **WHEN** una búsqueda filtrada no tiene coincidencias
- **THEN** el estado vacío ofrece **Quitar filtros** y "Buscar en otro tipo"

#### Scenario: Cargar más filtrado
- **WHEN** una persona pulsa "Cargar más" en Álbumes con `yearFrom=1983`
- **THEN** la página siguiente también cumple el filtro

### Requirement: Cambiar de tipo conserva solo los filtros compatibles

Los accesos para repetir la consulta en otro tipo SHALL conservar `q` y solo los filtros que el tipo destino entiende
(`artist` entre Álbumes y Canciones), y SHALL descartar los demás.

#### Scenario: De Álbumes a Canciones
- **WHEN** una persona en `/search?type=album&q=hallelujah&artist=jeff%20buckley&yearFrom=1994` elige "Buscar en
  Canciones"
- **THEN** la página navega a `/search?type=song&q=hallelujah&artist=jeff%20buckley`
