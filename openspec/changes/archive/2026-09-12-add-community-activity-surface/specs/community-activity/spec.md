## ADDED Requirements

### Requirement: Superficie pública de actividad de la comunidad

El sistema SHALL exponer una vista pública en `/{locale}/activity` para los locales
soportados, accesible **con y sin sesión**, que presenta la actividad reciente de la
comunidad. Sin sesión, la vista SHALL mostrar únicamente la fuente "Recientes", sin
pestañas. Con sesión, la vista SHALL mostrar tres fuentes —"Recientes", "De la gente que
seguís" y "Tu actividad"— como **pestañas**, con "Recientes" seleccionada por defecto.

Las pestañas SHALL mostrarse en conjunto solo cuando **al menos una** de las tres fuentes
disponibles tenga contenido; cuando ninguna tiene contenido, la vista SHALL mostrar un
estado vacío global localizado en su lugar y SHALL NOT devolver un error ni redirigir. Una
fuente individual sin contenido dentro de las pestañas SHALL mostrar un mensaje corto en
su propio panel en vez de ocultar la pestaña.

Las etiquetas de interfaz SHALL respetar el locale activo; los nombres de usuario y los
títulos de catálogo SHALL conservarse sin traducir.

#### Scenario: Visita pública sin sesión, sin pestañas

- **WHEN** una persona sin sesión abre `/es/activity` o `/en/activity` y hay actividad
  pública reciente
- **THEN** ve la sección "Recientes" directamente, sin ninguna barra de pestañas

#### Scenario: Visita con sesión, con pestañas

- **WHEN** una persona con sesión abre `/activity` y alguna de las tres fuentes tiene
  contenido
- **THEN** ve una barra de pestañas ("Recientes", "De la gente que seguís", "Tu
  actividad") con "Recientes" seleccionada por defecto

#### Scenario: Una fuente sin contenido muestra un mensaje, no desaparece

- **WHEN** con sesión, una de las tres fuentes no tiene actividad que mostrar
- **THEN** su pestaña sigue visible y, al seleccionarla, su panel muestra un mensaje corto
  en vez de una lista vacía

#### Scenario: Sin recomendación ni popularidad fabricada

- **WHEN** dos personas distintas con sesión abren `/activity`
- **THEN** la pestaña "Recientes" muestra la misma composición para ambas; "De la gente que
  seguís" y "Tu actividad" difieren según cada una; ninguna fuente ordena por una métrica de
  popularidad que el sistema no recopile realmente

#### Scenario: Superficie completamente vacía

- **WHEN** una persona abre `/activity` y ninguna fuente disponible para ella tiene
  contenido
- **THEN** ve un estado vacío localizado y no un error ni una redirección, y no se muestra
  ninguna barra de pestañas

### Requirement: Fuente "Recientes"

La vista `/activity` SHALL mostrar una fuente "Recientes" con ratings vigentes,
comentarios y reseñas de álbum de cualquier usuario con perfil `public`, en orden
cronológico descendente, paginada. La fuente SHALL excluir bloqueos en cualquier
dirección cuando hay sesión. Cada entrada SHALL mostrar autor (con enlace a su perfil),
tipo de actividad, objetivo (con carátula cuando exista y enlace a su página de catálogo),
fecha relativa y, para comentarios y reseñas, un fragmento del cuerpo. La fuente SHALL ser
accesible sin sesión y SHALL poder paginarse con una acción de "cargar más".

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

### Requirement: Fuente "De la gente que seguís"

La vista `/activity` SHALL mostrar, **solo cuando hay sesión**, una fuente con el mismo
feed de actividad de usuarios seguidos que expone `activity-feed` en `/me/feed`, sin
filtros adicionales. Para un lector anónimo esta fuente SHALL NOT estar disponible. La
fuente SHALL poder paginarse independientemente de las otras dos.

#### Scenario: Actividad de gente que sigo

- **WHEN** un usuario con sesión que sigue a otras personas abre la pestaña "De la gente
  que seguís"
- **THEN** ve la actividad visible reciente de esas personas, de la más reciente a la más
  antigua

#### Scenario: No disponible para visitantes anónimos

- **WHEN** una persona sin sesión abre `/activity`
- **THEN** no existe la pestaña "De la gente que seguís"

### Requirement: Fuente "Tu actividad"

La vista `/activity` SHALL mostrar, **solo cuando hay sesión**, una fuente con el mismo
rastro de actividad propia que expone "Tu rastro reciente" de Inicio (escuchas, ratings,
comentarios y reseñas del propio lector), sin filtros adicionales. Para un lector anónimo
esta fuente SHALL NOT estar disponible. La fuente SHALL poder paginarse independientemente
de las otras dos.

#### Scenario: Actividad propia

- **WHEN** un usuario con sesión con actividad propia abre la pestaña "Tu actividad"
- **THEN** ve su propio rastro de actividad, de la más reciente a la más antigua

#### Scenario: No disponible para visitantes anónimos

- **WHEN** una persona sin sesión abre `/activity`
- **THEN** no existe la pestaña "Tu actividad"

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/activity` en la barra general del Header, junto al
buscador, Listas y Registrar, **con y sin sesión**. El enlace SHALL usar la etiqueta
localizada de "Actividad" y SHALL apuntar a la superficie pública `/activity`, no a
`/me/feed`. En el panel móvil del Header el enlace SHALL vivir en el bloque de barra
general.

#### Scenario: Enlace visible para cualquiera

- **WHEN** se renderiza el Header, con o sin sesión
- **THEN** la barra general muestra un enlace "Actividad" hacia `/activity`

#### Scenario: El enlace no lleva al feed personal

- **WHEN** una persona activa el enlace "Actividad" del Header
- **THEN** llega a `/activity` y no a `/me/feed`
