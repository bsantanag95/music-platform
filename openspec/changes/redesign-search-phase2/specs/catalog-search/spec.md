## MODIFIED Requirements

### Requirement: Acceso directo a la canción resuelta

En el tipo Canciones de la búsqueda rápida, el grupo resuelto SHALL mostrarse como una ficha de la canción: título,
artista, duración si se conoce, la carátula del primer disco que la contiene y "Aparece en N discos" con hasta 5 de esos
discos y "Ver N más" para el resto. Si el grupo expone `recordingId`, la ficha SHALL ofrecer "Ver la canción", un enlace
directo a `/song/<id>`. El enlace SHALL mostrarse solo cuando `recordingId` no sea `null`; sin identidad resuelta, la
ficha SHALL conservar la lista de discos como único destino. Los grupos no resueltos SHALL seguir abriendo su propia
búsqueda. El título de la canción es dato del catálogo y SHALL NOT traducirse; el texto del enlace sí.

#### Scenario: Búsqueda exacta de canción

- **WHEN** una persona busca `dokken kiss of death` en Canciones y el grupo resuelto es
  "Kiss of Death — Dokken" con `recordingId`
- **THEN** la ficha muestra "Ver la canción" enlazando a `/song/<recordingId>` junto a los discos
  que contienen la canción

#### Scenario: Enlace en el primer render local

- **WHEN** el grupo resuelto tiene apariciones locales y la página pinta primero las coincidencias
  locales antes de la respuesta de MusicBrainz
- **THEN** el enlace directo a `/song/<id>` ya está visible y se mantiene tras llegar el resto

#### Scenario: Grupo sin identidad resuelta

- **WHEN** un grupo no logra una grabación identidad (`recordingId` es `null`)
- **THEN** la ficha no muestra el enlace directo y solo lista sus discos

#### Scenario: Grupos no resueltos

- **WHEN** la respuesta incluye "Otras canciones con ese título"
- **THEN** esas filas siguen abriendo su propia búsqueda y no enlazan a `/song/<id>`

#### Scenario: Ficha de Creep

- **WHEN** una persona busca `creep` en Canciones
- **THEN** ve la ficha "Creep — Radiohead" con su duración, la carátula de su primer disco, "Aparece en 12 discos" con 5
  carátulas y "Ver 7 más"

## ADDED Requirements

### Requirement: Ficha de respuesta en Álbumes

En la búsqueda rápida de Álbumes, cuando el primer resultado cubre la consulta (su título es la consulta, o la consulta es
artista + título), la página SHALL mostrarlo en una ficha: carátula en miniatura de 250 px (nunca a resolución completa),
título, artista, categoría y año, la media de la comunidad en forma compacta si la hay, y "Ver el disco". Si el disco
tiene una edición representativa ya guardada en la base propia, la ficha SHALL mostrar sus primeras 6 canciones y cuántas
más tiene. La búsqueda SHALL NOT ingerir la tracklist para mostrarla. Si la lista trae otros discos del mismo artista con
el mismo título, la ficha SHALL enlazarlos ("También: Single · 2023") y SHALL NOT repetirlos debajo. El resto de
resultados SHALL ir bajo "Otros álbumes". Sin un primer resultado que cubra la consulta no hay ficha.

#### Scenario: The Wall
- **WHEN** una persona busca `the wall` en Álbumes
- **THEN** ve la ficha de "The Wall" de Pink Floyd (De estudio · 1979) con "Ver el disco" y "También: Singles y EPs · 2023",
  y debajo "Otros álbumes" con el resto, sin esos dos

#### Scenario: Tracklist guardada
- **WHEN** el disco de la ficha ya tiene su edición representativa con canciones en la base propia
- **THEN** la ficha muestra las 6 primeras y "y N más", sin solicitudes a MusicBrainz

#### Scenario: Tracklist no guardada
- **WHEN** el disco de la ficha no tiene canciones guardadas
- **THEN** la ficha se muestra sin canciones y la búsqueda no las ingiere

#### Scenario: Consulta que no es un título
- **WHEN** una persona busca `pink floid` en Álbumes y ningún título cubre la consulta
- **THEN** no hay ficha y la lista se muestra como antes

### Requirement: La consulta en otros tipos

En la búsqueda rápida, la columna lateral SHALL mostrar hasta tres coincidencias del mismo texto en otro tipo, tomadas
**solo de la base propia** (sin solicitudes a MusicBrainz): Artistas muestra álbumes; Álbumes, canciones; y Canciones,
álbumes. Cada panel SHALL llevar un enlace a esa misma búsqueda en el otro tipo. Si no hay coincidencias locales, el panel
SHALL NOT mostrarse. Usuarios no tiene este panel. El panel SHALL transmitirse aparte, sin retrasar los resultados.

#### Scenario: Artistas
- **WHEN** una persona busca `pink` en Artistas y el catálogo tiene álbumes titulados "Pink"
- **THEN** la columna lateral muestra "«pink» en álbumes" con hasta tres de ellos y "Ver álbumes →" a
  `/search?type=album&q=pink`

#### Scenario: Sin coincidencias locales
- **WHEN** una persona busca `qzxvbnmqk` en Canciones
- **THEN** la columna lateral no muestra el panel de álbumes

#### Scenario: Sin MusicBrainz
- **WHEN** la página arma el panel de otro tipo
- **THEN** no se hace ninguna solicitud a MusicBrainz para él
