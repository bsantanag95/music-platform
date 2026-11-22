## ADDED Requirements

### Requirement: Vocabulario cerrado de temas de lista

Cada lista SHALL poder declarar un tema de un vocabulario cerrado de diez valores, en este orden de presentación:
`start_here` ("Por dónde empezar" / "Where to start"), `recommendations` ("Recomendaciones" / "Recommendations"),
`personal_ranking` ("Ranking personal" / "Personal ranking"), `hidden_gems` ("Joyas ocultas" / "Hidden gems"), `moment`
("Para un momento" / "For a moment"), `history` ("Historia y contexto" / "History and context"), `connections`
("Conexiones" / "Connections"), `year_review` ("Balance del año" / "Year in review"), `curiosities` ("Curiosidades" /
"Curiosities") y `other` ("Otro" / "Other"). Cada tema SHALL tener además una descripción corta localizada que el formulario
muestra junto al nombre. La base de datos SHALL rechazar cualquier valor fuera del vocabulario con un `CHECK`; `NULL` SHALL
significar "Sin tema" y SHALL estar permitido solo para listas que ya existían o que crea el sistema sin tema (colecciones
generadas, listas editoriales). Una lista SHALL tener a lo sumo un tema. No SHALL existir etiquetas libres.

#### Scenario: Valor fuera del vocabulario

- **WHEN** una request o una escritura directa en la base intenta guardar `theme = 'recs'`
- **THEN** la API responde un error de validación y la base rechaza la fila por el `CHECK`

#### Scenario: Lista existente sin tema

- **WHEN** se aplica la migración sobre una base con listas creadas antes de este cambio
- **THEN** todas quedan con `theme = NULL` y ninguna recibe un tema deducido de su título

### Requirement: Sobre qué trata una lista

Una lista SHALL poder declarar opcionalmente de qué trata: un artista (`subject_artist_id`) o un género (`subject_genre_id`),
nunca ambos. La base de datos SHALL garantizarlo con `CHECK (num_nonnulls(subject_artist_id, subject_genre_id) <= 1)` y con
claves foráneas `ON DELETE SET NULL`. El "sobre" SHALL ser independiente del contenido: una lista sobre Pink Floyd puede no
contener ningún disco de la banda. Las respuestas de lista SHALL exponer el "sobre" como `{ type, id, name, slug? }` (nombre
localizado para un género) o `null`. El "sobre" SHALL mostrarse como "sobre <nombre>" ("about <name>") enlazado a la ficha del
artista o del género.

#### Scenario: Artista y género a la vez

- **WHEN** una request envía `subjectArtistId` y `subjectGenreId` juntos
- **THEN** la API responde un error de validación y no guarda la lista

#### Scenario: Se borra el artista del "sobre"

- **WHEN** se elimina el artista que una lista declaraba como "sobre"
- **THEN** la lista sigue existiendo con su tema y su "sobre" queda vacío

#### Scenario: Sobre un género

- **WHEN** una lista declara como "sobre" el género Doom metal
- **THEN** su fila, su vista previa y su encabezado muestran "sobre Doom metal" con enlace a la ficha del género

### Requirement: Tema asignado por el sistema

Las listas que crea el sistema por una acción de la persona SHALL recibir tema en su alta, sin pasar por el formulario: un
Camino (`custom_journey`) SHALL nacer con `start_here`; un recorrido de artista (`artist_journey`) SHALL nacer con
`start_here` y su artista como "sobre"; una lámina Top N (`top`) y una tier list (`tier`) SHALL nacer con
`personal_ranking`. La persona dueña SHALL poder cambiar ese tema después. Las colecciones generadas y las listas editoriales
SHALL NOT recibir tema en este cambio.

#### Scenario: Camino nuevo

- **WHEN** una persona crea un Camino
- **THEN** la lista se guarda con `theme = 'start_here'` y sin "sobre"

#### Scenario: Recorrido de artista

- **WHEN** una persona empieza el recorrido de la discografía de Radiohead
- **THEN** la lista se guarda con `theme = 'start_here'` y `subject_artist_id` = Radiohead

#### Scenario: Lámina Top N

- **WHEN** una persona crea una lámina Top 10
- **THEN** la lista se guarda con `theme = 'personal_ranking'`

### Requirement: Chip de tema

El tema SHALL mostrarse como un chip con su nombre localizado y un color propio por tema, el mismo en todas las superficies:
filas del Lector de `/lists`, vista previa, encabezado del detalle de lista y tarjetas y filas de `/me/lists`. El color SHALL
acompañar al texto, nunca reemplazarlo, y el texto del chip SHALL cumplir contraste AA sobre su fondo. Una lista sin tema
SHALL NOT mostrar chip en las superficies públicas.

#### Scenario: Fila con tema y "sobre"

- **WHEN** el Lector muestra una lista con tema Recomendaciones y "sobre" Psicodelia
- **THEN** la fila muestra el chip "Recomendaciones" y "sobre Psicodelia" encima del título

#### Scenario: Lista sin tema en público

- **WHEN** el Lector muestra una lista con `theme = NULL`
- **THEN** la fila no muestra chip y conserva el resto de su presentación

### Requirement: Clasificar listas propias sin tema

`/me/lists` SHALL avisar, cuando existan, cuántas de las listas propias que muestra "Mis listas" no tienen tema, y SHALL ofrecer asignar
el tema a cada una con un toque, sin abrir el formulario de edición. Asignar el tema desde ahí SHALL usar la misma
modificación de lista que la edición (`PATCH`). El aviso SHALL desaparecer cuando ninguna lista propia quede sin tema. El
sistema SHALL NOT sugerir ni preseleccionar un tema a partir del título en este aviso.

#### Scenario: Clasificar una lista vieja

- **WHEN** una persona con tres listas sin tema elige "Ranking personal" para "Best AOR songs" desde el aviso
- **THEN** la lista queda con `theme = 'personal_ranking'` y el aviso pasa a contar dos

#### Scenario: Sin listas por clasificar

- **WHEN** todas las listas propias tienen tema
- **THEN** `/me/lists` no muestra el aviso
