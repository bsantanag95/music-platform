## ADDED Requirements

### Requirement: Solista y Otras personas

En Artistas, **Solista** (`artistType=solo`) SHALL buscarse como **Grupo**: en la base propia (`type = person`) y en
MusicBrainz (`type:person`), con los mismos campos, y SHALL descartar después de fusionar las personas cuya discografía
está explorada y no tienen ningún disco como artista principal; las demás personas SHALL conservarse. Con algún campo del
catálogo, Solista SHALL exigir al menos un disco propio en la base. **Otras personas** (`artistType=other`) SHALL
resolverse siempre en "Modo solo catálogo": sin rol, personas sin discos propios que tienen alguna pertenencia a una
banda o algún crédito de personal; con rol, las personas que cumplen ese rol, tengan o no discos propios.

#### Scenario: Buscar a una solista como a un grupo
- **WHEN** una persona busca `Madonna` en Artistas con Tipo Solista y la caché fría
- **THEN** se emite la consulta a MusicBrainz con `type:person` y Madonna aparece en los resultados

#### Scenario: Integrante sin carrera solista
- **WHEN** una persona del catálogo tiene la discografía explorada, ningún disco propio y es integrante de una banda
- **THEN** no aparece con Solista y sí con Otras personas

#### Scenario: Solista cargado como integrante
- **WHEN** una persona del catálogo es integrante de una banda, tiene la discografía sin explorar y MusicBrainz la
  devuelve para la búsqueda
- **THEN** aparece con Solista

#### Scenario: Otras personas no consulta MusicBrainz
- **WHEN** una persona busca en Artistas con Tipo Otras personas y Chile
- **THEN** no se emite ninguna solicitud a MusicBrainz y la página dice "Solo artistas del catálogo"

### Requirement: Tipos de persona anteriores en la URL

El lector de criterios SHALL aceptar los valores anteriores al cambio: `artistType=person` SHALL leerse como `solo`;
`artistType=person` con `role=own`, como `solo` sin rol; `artistType=person` con `role=member`, `producer` o `musician`,
como `other` con ese rol. `role=own` con cualquier otro tipo SHALL ignorarse.

#### Scenario: Enlace antiguo de integrantes
- **WHEN** una persona abre `/search/advanced?type=artist&artistType=person&role=member&country=CL`
- **THEN** la búsqueda es Otras personas, Integrante de una banda, Chile, y la barra muestra "Otras personas"

#### Scenario: Enlace antiguo de discografía propia
- **WHEN** una persona abre `/search/advanced?type=artist&artistType=person&role=own`
- **THEN** la búsqueda es Solista, sin rol

## MODIFIED Requirements

### Requirement: Campos de Artistas

La pestaña Artistas SHALL ofrecer: **Nombre** (`q`) con **¿Coincidencia exacta?** (`exact=1`), **Tipo** (cualquiera,
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

### Requirement: Cada campo con el mismo criterio en las dos fuentes

Cada campo que no es del catálogo SHALL traducirse a una condición sobre la base local y a una cláusula de la consulta de
MusicBrainz con el mismo significado: `type` (`solo` como `person`), `country`, `beginarea`, `begin` y `ended` en
artistas; `releasegroup`, `artist`, `firstreleasedate`, `primarytype` y `secondarytype` en release-groups; `recording`,
`artist`, `release`, `primarytype`, `secondarytype` y `dur` en recordings. Los textos SHALL escaparse para Lucene, y
`area` SHALL ir sin acentos. Una fila sin el dato que pide un campo SHALL NOT coincidir. En Artistas, la fila local y la
de MusicBrainz SHALL fusionarse por `mbid` antes de filtrar. Ningún campo SHALL sumar solicitudes a MusicBrainz más allá
del presupuesto por tipo. Los campos del catálogo (`activeFrom`, `activeTo`, `role`, `genre`, `award`, `awardWon`,
`artistCountry`) y el tipo `artistType=other` no tienen cláusula en MusicBrainz: con alguno de ellos, la búsqueda SHALL
seguir "Modo solo catálogo".

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

### Requirement: Encabezado de resultados de la búsqueda avanzada

El encabezado de resultados SHALL mostrar la cifra total con separador de miles y lo que se cuenta: "grupos", "solistas"
o "personas" (Otras personas) si se filtró por tipo de artista, "artistas" si no; "álbumes"; "canciones". SHALL NOT
acotarse a "más de 1000" ni repetirse en el aviso de búsqueda amplia.

#### Scenario: Cifra de grupos
- **WHEN** una búsqueda de grupos de Chile formados entre 1980 y 1989 da 53 resultados
- **THEN** el encabezado dice "53 grupos"

#### Scenario: Cifra de solistas
- **WHEN** una búsqueda de solistas de Chile da 120 resultados
- **THEN** el encabezado dice "120 solistas"

### Requirement: Período de actividad

En Artistas, **Activo entre** desde/hasta (`activeFrom`, `activeTo`, años de 1900 a 2100) SHALL coincidir con los
artistas cuyo período de actividad se solapa con ese rango. El período SHALL ser del año del primer al último disco con
el artista como principal, y SHALL llegar hasta el año en curso si el artista no consta como separado o fallecido. Solo
los artistas con la discografía explorada SHALL tener período: los demás SHALL NOT coincidir. Con Otras personas, el
formulario SHALL NOT ofrecer "Activo entre" y `activeFrom`/`activeTo` SHALL ignorarse. Las filas SHALL mostrar el
período ("Activo desde 2006", o "Activo 1979–1999" si terminó) y destacarlo; la vista Tabla SHALL sumar la columna
"Activo".

#### Scenario: Activos en los 80, no nacidos en los 80
- **WHEN** una persona busca Solista, Chile, activo entre 1980 y 1990
- **THEN** no ve a Javiera Mena (nacida en 1983, primer disco en 2006)

#### Scenario: Sigue en actividad
- **WHEN** una persona busca artistas activos entre 2020 y 2025 y un grupo publicó su último disco en 2015 pero no consta
  como separado
- **THEN** el grupo aparece, con el período hasta hoy

#### Scenario: Discografía sin explorar
- **WHEN** un artista del catálogo nunca tuvo su discografía explorada
- **THEN** no aparece en una búsqueda por actividad

#### Scenario: Actividad con Otras personas
- **WHEN** una persona abre `/search/advanced?type=artist&artistType=other&activeFrom=1980`
- **THEN** la búsqueda ignora la actividad y el formulario no muestra "Activo entre"

### Requirement: Rol de una persona

En Artistas, con Tipo Otras personas, **Rol** (`role`) SHALL ofrecer: Cualquiera (sin parámetro), **Integrante de una
banda** (`member`), **Producción o técnica** (`producer`: créditos de personal de producción, ingeniería, mezcla,
grabación, programación o arreglos) y **Músico invitado o de sesión** (`musician`: créditos de instrumento o voz en discos
donde no es artista principal). Sin Tipo Otras personas, `role` SHALL ignorarse, y el formulario SHALL mostrar Rol solo
con Otras personas.

#### Scenario: Integrantes con carrera solista
- **WHEN** una persona busca Otras personas con Integrante de una banda y el nombre de un integrante que también tiene
  discos propios
- **THEN** lo ve en los resultados

#### Scenario: Buscar al productor
- **WHEN** una persona busca Otras personas con Producción o técnica y el nombre de un productor del catálogo sin discos
  propios
- **THEN** lo ve en los resultados, y con Solista en modo solo catálogo no

#### Scenario: Rol sin Otras personas
- **WHEN** una persona abre `/search/advanced?type=artist&artistType=group&role=member`
- **THEN** la búsqueda ignora el rol y sigue el modo habitual

### Requirement: Campos del catálogo en la barra, el estado vacío y la tabla

Cada campo del catálogo SHALL tener su pastilla en la barra de criterios ("Activo 1980–1990", "Integrante de una
banda", "Rock y subgéneros", "Grammy · ganador", una por país del artista) que se quita como las demás, y SHALL contarse
en el envío fijo en móvil. El tipo SHALL mostrarse como "Grupo", "Solista" u "Otras personas"; quitar "Otras personas"
SHALL quitar también el rol. Sin resultados, el estado vacío SHALL ofrecer "Sin <campo>" también para los campos del
catálogo, y la cifra de esa búsqueda sin el campo. Las filas SHALL destacar el género y el país del artista filtrados en
Álbumes.

#### Scenario: Quitar el género
- **WHEN** una persona pulsa la pastilla "Rock y subgéneros" en una búsqueda de álbumes de rock de Chile
- **THEN** la página navega a la misma búsqueda sin `genre`

#### Scenario: Quitar Otras personas
- **WHEN** una persona pulsa la pastilla "Otras personas" en una búsqueda de Otras personas con Integrante de una banda
- **THEN** la página navega a la misma búsqueda sin `artistType` ni `role`
