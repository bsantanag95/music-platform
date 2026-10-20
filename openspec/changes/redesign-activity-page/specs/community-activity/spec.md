## MODIFIED Requirements

### Requirement: Superficie pública de actividad de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/activity` para los locales
soportados, accesible **con y sin sesión**, que presenta la actividad reciente de la
comunidad. Sin sesión, la vista SHALL mostrar únicamente la fuente "Recientes", sin
pestañas. Con sesión, la vista SHALL mostrar tres fuentes como **pestañas** con etiquetas
cortas —"Recientes", "Siguiendo" y "Tú" ("Recent", "Following", "You" en inglés)—, con
"Recientes" seleccionada por defecto cuando la URL no indica otra.

Las pestañas SHALL mostrarse en conjunto solo cuando **al menos una** de las tres fuentes
disponibles tenga contenido; cuando ninguna tiene contenido, la vista SHALL mostrar un
estado vacío global localizado en su lugar y SHALL NOT devolver un error ni redirigir. Una
fuente individual sin contenido dentro de las pestañas SHALL mostrar en su propio panel un
estado vacío con acción (ver "Estados vacíos con acción") en vez de ocultar la pestaña.

Las etiquetas de interfaz SHALL respetar el locale activo; los nombres de usuario y los
títulos de catálogo SHALL conservarse sin traducir. La copia en español SHALL usar tuteo de
forma consistente.

#### Scenario: Visita pública sin sesión, sin pestañas

- **WHEN** una persona sin sesión abre `/es/activity` o `/en/activity` y hay actividad
  pública reciente
- **THEN** ve la sección "Recientes" directamente, sin ninguna barra de pestañas

#### Scenario: Visita con sesión, con pestañas

- **WHEN** una persona con sesión abre `/activity` sin parámetros y alguna de las tres
  fuentes tiene contenido
- **THEN** ve una barra de pestañas ("Recientes", "Siguiendo", "Tú") con "Recientes"
  seleccionada

#### Scenario: Una fuente sin contenido muestra un estado vacío, no desaparece

- **WHEN** con sesión, una de las tres fuentes no tiene actividad que mostrar
- **THEN** su pestaña sigue visible y, al seleccionarla, su panel muestra un estado vacío
  con una acción en vez de una lista vacía

#### Scenario: Sin recomendación ni popularidad fabricada

- **WHEN** dos personas distintas con sesión abren `/activity`
- **THEN** la pestaña "Recientes" muestra la misma composición para ambas (salvo bloqueos);
  "Siguiendo" y "Tú" difieren según cada una; ninguna fuente ni módulo de la página ordena
  por una métrica que el sistema no recopile realmente

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/activity` y ninguna fuente disponible para ella tiene
  contenido
- **THEN** ve un estado vacío localizado y no un error ni una redirección, y no se muestra
  ninguna barra de pestañas

#### Scenario: Las tres pestañas son alcanzables en móvil

- **WHEN** una persona con sesión abre `/activity` en un viewport de 375px de ancho
- **THEN** las tres pestañas se ven completas sin desplazamiento horizontal; si una
  traducción no cupiera, el borde de la barra se desvanece para indicar que hay más

#### Scenario: El hover no imita la pestaña activa

- **WHEN** el puntero pasa sobre una pestaña no seleccionada
- **THEN** cambia solo el color de su texto; el subrayado queda reservado para la pestaña
  seleccionada

### Requirement: Fuente "Recientes"

La vista `/activity` SHALL mostrar una fuente "Recientes" con ratings vigentes,
comentarios y reseñas de álbum de cualquier usuario con perfil `public`, en orden
cronológico descendente, paginada. La fuente SHALL excluir bloqueos en cualquier
dirección cuando hay sesión. Cada entrada SHALL mostrar autor (con enlace a su perfil),
tipo de actividad, objetivo (con carátula cuando exista y enlace a su página de catálogo),
fecha relativa y, para comentarios y reseñas, un fragmento del cuerpo. La fuente SHALL ser
accesible sin sesión y SHALL poder paginarse con una acción de "cargar más".

La fuente SHALL poder filtrarse por tipo —valoraciones, comentarios o reseñas— y
`GET /api/activity/recent` SHALL aceptar un parámetro opcional `kind` con los valores
`rating`, `comment` o `review`. Sin `kind`, la respuesta SHALL ser la misma que antes de este
cambio; con un valor fuera de esa lista, el endpoint SHALL responder `400 VALIDATION_ERROR`.

#### Scenario: Actividad reciente con y sin sesión

- **WHEN** una persona con o sin sesión abre `/activity` y hay actividad pública reciente
- **THEN** "Recientes" la muestra en orden cronológico descendente, con autor, tipo,
  objetivo y fecha relativa

#### Scenario: Incluye reseñas de álbum

- **WHEN** un usuario con perfil público publica una reseña de álbum
- **THEN** esa reseña aparece en "Recientes" con su título (si tiene) y un fragmento del
  cuerpo

#### Scenario: Exclusión por bloqueo

- **WHEN** existe un bloqueo en cualquier dirección entre el lector con sesión y el autor
  de una entrada
- **THEN** esa entrada no aparece en "Recientes" para ese lector

#### Scenario: Filtro por tipo

- **WHEN** una persona abre `/activity?kind=review`
- **THEN** "Recientes" muestra solo reseñas, y "cargar más" sigue trayendo solo reseñas

#### Scenario: Valor de kind inválido en la API

- **WHEN** un cliente pide `GET /api/activity/recent?kind=listen`
- **THEN** recibe `400` con `{ error, code: "VALIDATION_ERROR" }`

### Requirement: Fuente "De la gente que seguís"

La vista `/activity` SHALL mostrar, **solo cuando hay sesión**, una fuente con la etiqueta
"Siguiendo" ("Following") y el mismo feed de actividad de usuarios seguidos que expone
`activity-feed` en `/me/feed`. La fuente SHALL poder filtrarse por tipo con los valores que
ya acepta `GET /api/me/feed` que se ofrecen en la página: reseñas, comentarios, valoraciones,
escuchas y listas. Para un lector anónimo esta fuente SHALL NOT estar disponible. La fuente
SHALL poder paginarse independientemente de las otras dos.

#### Scenario: Actividad de gente que sigo

- **WHEN** un usuario con sesión que sigue a otras personas abre la pestaña "Siguiendo"
- **THEN** ve la actividad visible reciente de esas personas, de la más reciente a la más
  antigua

#### Scenario: Filtro por tipo en Siguiendo

- **WHEN** un usuario con sesión abre `/activity?tab=following&kind=listen`
- **THEN** ve solo las escuchas de la gente que sigue

#### Scenario: No disponible para visitantes anónimos

- **WHEN** una persona sin sesión abre `/activity`
- **THEN** no existe la pestaña "Siguiendo"

### Requirement: Fuente "Tu actividad"

La vista `/activity` SHALL mostrar, **solo cuando hay sesión**, una fuente con la etiqueta
"Tú" ("You") y el mismo rastro de actividad propia que expone "Tu rastro reciente" de Inicio
(escuchas, ratings, comentarios y reseñas del propio lector), sin filtros. En `/activity`, cada
entrada SHALL presentarse con la misma anatomía que las otras pestañas —carátula del objetivo
a la izquierda, sin autor— y la valoración SHALL ocupar siempre la misma posición, sin
depender del largo del título. Para un lector anónimo esta fuente SHALL NOT estar disponible.
La fuente SHALL poder paginarse independientemente de las otras dos.

#### Scenario: Actividad propia

- **WHEN** un usuario con sesión con actividad propia abre la pestaña "Tú"
- **THEN** ve su propio rastro de actividad, de la más reciente a la más antigua, con la
  carátula de cada objetivo

#### Scenario: Posición estable de la nota

- **WHEN** el rastro propio incluye una valoración de un título corto y otra de un título que
  ocupa varias líneas
- **THEN** en ambas la nota aparece en la misma posición relativa al título

#### Scenario: No disponible para visitantes anónimos

- **WHEN** una persona sin sesión abre `/activity`
- **THEN** no existe la pestaña "Tú"

## ADDED Requirements

### Requirement: Pestaña y filtro en la URL

Con sesión, la pestaña seleccionada SHALL reflejarse en el parámetro `tab` de la URL
(`following` o `you`; sin parámetro, Recientes) y el filtro de tipo en `kind`. Al abrir una
URL con esos parámetros, el servidor SHALL renderizar directamente esa pestaña con ese
filtro. Cambiar de pestaña o de filtro SHALL actualizar la URL sin apilar entradas de
historial. Un `tab` desconocido SHALL tratarse como Recientes y un `kind` que no aplica a la
pestaña SHALL ignorarse, sin error. Sin sesión, `tab` SHALL ignorarse.

#### Scenario: Enlace directo a una pestaña

- **WHEN** una persona con sesión abre `/activity?tab=you`
- **THEN** la página llega renderizada con "Tú" seleccionada, sin mostrar antes Recientes

#### Scenario: Recargar conserva la pestaña y el filtro

- **WHEN** una persona elige "Siguiendo" y el filtro "Reseñas" y recarga la página
- **THEN** sigue viendo "Siguiendo" filtrada por reseñas

#### Scenario: Parámetros desconocidos

- **WHEN** una persona abre `/activity?tab=otra&kind=xyz`
- **THEN** ve Recientes sin filtro, sin error

### Requirement: Filtros por tipo en chips

Las pestañas "Recientes" y "Siguiendo" SHALL ofrecer, sobre la lista, una fila de chips de
filtro con "Todo" seleccionado por defecto. En Recientes: Todo, Reseñas, Comentarios y
Valoraciones. En Siguiendo, además: Escuchas y Listas. "Tú" SHALL NOT mostrar chips. Los chips
SHALL exponer su estado seleccionado a tecnologías de asistencia y, en móvil, SHALL poder
desplazarse en una sola fila sin desbordar la página.

#### Scenario: Elegir un filtro

- **WHEN** en Recientes una persona toca "Comentarios"
- **THEN** la lista muestra solo comentarios y el chip queda marcado como seleccionado

#### Scenario: Volver a todo

- **WHEN** con un filtro activo la persona toca "Todo"
- **THEN** la lista vuelve a mostrar todos los tipos de esa pestaña y `kind` sale de la URL

### Requirement: Estados vacíos con acción

Cada panel vacío de `/activity` SHALL mostrar un título, una línea de explicación y una
acción que lleve a algún lugar útil, nunca un mensaje sin salida:

- Un filtro sin resultados SHALL ofrecer "Ver todo", que quita el filtro.
- "Siguiendo" cuando la persona no sigue a nadie, o la gente que sigue no tiene actividad,
  SHALL ofrecer "Descubrir personas" hacia `/users`.
- "Tú" sin actividad SHALL ofrecer "Explorar música" hacia `/explore`.

#### Scenario: No sigue a nadie

- **WHEN** una persona con sesión que no sigue a nadie abre "Siguiendo"
- **THEN** ve una explicación de que ahí aparece la actividad de la gente que sigue y un
  botón "Descubrir personas" que lleva a `/users`

#### Scenario: Filtro sin resultados

- **WHEN** el filtro "Reseñas" de Recientes no tiene entradas
- **THEN** el panel ofrece "Ver todo" y, al activarlo, vuelve a la lista sin filtro

### Requirement: Línea de metadatos legible en cualquier ancho

En las filas de actividad, el autor, el verbo con su ícono, la audiencia y los separadores
SHALL comportarse como unidades indivisibles: un salto de línea SHALL caer solo entre
unidades completas, nunca dejar un separador "·" al final de una línea ni separar un ícono
de su verbo. En anchos menores a `sm`, la fecha relativa SHALL integrarse al final de la
línea de metadato como una unidad más, en lugar de ocupar una columna propia que fuerce el
salto de la línea del autor. La fecha SHALL NOT usar abreviaturas ambiguas (en español, el
estilo corto de `Intl` abrevia mes y año a "m" y "a").

#### Scenario: Fila en móvil

- **WHEN** una fila de "Valoró, reseñó y comentó" se muestra en un viewport de 375px
- **THEN** ninguna línea termina en "·" y el ícono aparece junto al verbo

### Requirement: Bloques de fecha

La lista de `/activity` SHALL agrupar visualmente sus filas bajo encabezados de bloque de
fecha —"Hoy", "Esta semana", "Este mes" y "Antes" ("Today", "This week", "This month",
"Earlier")— calculados respecto del momento de lectura. Un encabezado SHALL aparecer solo
cuando cambia el bloque de la fila siguiente, también al sumar páginas con "cargar más".
Cada fila SHALL conservar su fecha relativa.

#### Scenario: Actividad de distintas épocas

- **WHEN** la lista tiene entradas de hoy, de hace 3 días y de hace 2 meses
- **THEN** aparecen los encabezados "Hoy", "Esta semana" y "Antes", cada uno una sola vez,
  sobre sus filas

#### Scenario: Cargar más continúa el bloque

- **WHEN** la página 2 empieza con entradas del mismo bloque que cerró la página 1
- **THEN** no se repite el encabezado de ese bloque

### Requirement: Tarjeta de reseña

En `/activity`, una entrada de reseña —sola o fusionada con su valoración o comentario—
SHALL presentarse como una tarjeta de lectura: estrellas (si hay valoración), titular de la
reseña (si existe), un extracto del cuerpo plegado a un máximo de 4 líneas y un enlace "Leer
reseña" a la página de la reseña.

#### Scenario: Reseña larga

- **WHEN** "Recientes" incluye una reseña cuyo cuerpo ocupa más de 4 líneas
- **THEN** la tarjeta muestra las primeras líneas y un enlace "Leer reseña" que abre
  `/review/...` de esa reseña

### Requirement: Riel de contexto

Desde un ancho de 1024px, `/activity` SHALL mostrar junto al feed un riel lateral, sin
reducir la columna del feed por debajo de su ancho de lectura. En anchos menores, el riel
SHALL mostrarse después de la lista. El riel SHALL contener:

- **"Con más conversación esta semana"**: hasta 5 álbumes con al menos 2 personas distintas
  que, en los últimos 7 días, los valoraron, comentaron (sin contar respuestas) o reseñaron,
  aplicando las mismas reglas de visibilidad que "Recientes" (perfil público, cuenta activa,
  contenido no moderado, sin bloqueo con el lector). Se ordenan por personas distintas, y a
  igualdad por la actividad más reciente. Cada álbum SHALL mostrar su carátula, su título, su
  artista y la cantidad de personas. Si no hay ningún álbum que cumpla el umbral, el módulo
  SHALL NOT mostrarse y SHALL NOT completarse con otros álbumes.
- **"Sigue a más gente"**: con sesión, solo cuando la persona sigue a menos de 3 usuarios,
  con un enlace a `/users`; sin sesión, con una invitación a crear una cuenta.

#### Scenario: Álbum con conversación

- **WHEN** tres personas con perfil público valoraron o reseñaron el mismo álbum en los
  últimos 7 días
- **THEN** el álbum aparece en "Con más conversación esta semana" con "3 personas"

#### Scenario: Una sola persona no alcanza

- **WHEN** una sola persona comentó cinco veces un álbum esta semana
- **THEN** ese álbum no aparece en el módulo

#### Scenario: Bloqueo en el riel

- **WHEN** el lector bloqueó a una de las personas que comentaron un álbum
- **THEN** esa persona no cuenta para ese lector, y si el álbum queda por debajo de 2
  personas no aparece

#### Scenario: Persona que ya sigue a mucha gente

- **WHEN** una persona con sesión que sigue a 10 usuarios abre `/activity`
- **THEN** no ve la tarjeta "Sigue a más gente"
