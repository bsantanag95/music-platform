## MODIFIED Requirements

### Requirement: Autoría en la página de canción

La página de canción SHALL mostrar, en la ficha técnica de la cabecera, una fila "Escrita
por" con los autores de la obra (u obras) de la grabación, cada uno enlazado a su página de
artista, y el rol entre paréntesis cuando no es `writer` ("música", "letra"); y SHALL
repetirlos con todos sus roles en el bloque Composición (capacidad `song-page-layout`). La
autoría SHALL obtenerse con una consulta de lectura, sin requests a MusicBrainz al
renderizar. Sin autores registrados, la fila y el bloque SHALL NOT mostrarse.

#### Scenario: Canción con autores

- **WHEN** una persona abre la página de "Eyes Wide Open"
- **THEN** la ficha técnica muestra "Escrita por Jerrod Bettis, Meghan Kabir, Audra Mae" con
  enlaces a sus páginas, y el bloque Composición los lista con sus roles

#### Scenario: Versión con obra compartida

- **WHEN** una versión en vivo comparte la obra con la versión de estudio
- **THEN** su página muestra los mismos autores

#### Scenario: Sin autores

- **WHEN** la grabación no tiene obra o su obra no tiene autores
- **THEN** la página no muestra la fila "Escrita por" ni el bloque Composición

## REMOVED Requirements

### Requirement: Página de canción mínima liderada por el álbum

**Reason**: La canción pasa a ser una ficha compacta de biblioteca (cambio
`redesign-song-page`): la cabecera lleva identidad, ficha, comunidad y panel; los discos que
la contienen se segmentan por tipo y se suman las versiones de la obra.

**Migration**: Estructura en `song-page-layout` (zonas, disco principal, tira de pistas,
composición y créditos); discos y versiones en `song-versions`. La restricción de reseñas a
álbumes sigue en `album-review`.

### Requirement: Reacción cualitativa primaria, estrellas secundarias en canción

**Reason**: Las estrellas de la canción ya están a la vista en la lista de canciones del
álbum (`rework-album-tracklist`); esconderlas en la página de la canción era incoherente.

**Migration**: Estrellas visibles en el panel (`song-personal-panel`, "Estrellas visibles en
la canción"); la reacción cualitativa se elige al registrar la escucha en el diario
("Escucha con reacción e historial en una línea").

### Requirement: Reacción agregada pública de la canción

**Reason**: La reacción de la comunidad pasa a ser una tarjeta del bloque de comunidad de
la canción, junto a la valoración media y las favoritas.

**Migration**: `song-community-stats` ("Bloque de comunidad de la canción", umbral de 5
reacciones públicas y origen solo en entradas `public`).

### Requirement: Historial de escuchas propio en la canción

**Reason**: El historial deja de ser una sección aparte y se resume en el panel.

**Migration**: `song-personal-panel` ("Escucha con reacción e historial en una línea"), con
enlace al diario para ver cada escucha.
