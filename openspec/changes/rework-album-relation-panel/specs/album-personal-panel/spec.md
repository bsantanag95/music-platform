## MODIFIED Requirements

### Requirement: Panel "Tu relación"

La cabecera del álbum SHALL incluir un panel "Tu relación" que reúna todas las acciones
personales sobre el álbum: valoración propia (estrellas y puntaje detallado), reseña
propia, escuchas, favorito, Pendiente, colección, búsqueda y listas. La página SHALL NOT
mostrar estas acciones fuera del panel (salvo las acciones por pista de la tracklist).
La valoración propia SHALL editarse en el panel, no al pie de la página. Las filas del
panel SHALL rotularse sin el posesivo ("Nota", "Reseña", "Escuchas"): la pertenencia al
usuario la comunican el título del panel y el estado visual de cada fila.

#### Scenario: Acciones reunidas

- **WHEN** un usuario autenticado abre un álbum
- **THEN** todas las acciones personales sobre el álbum están en el panel y no hay una
  columna de botones aparte

#### Scenario: Valorar desde el panel

- **WHEN** un usuario elige 4½ estrellas en el panel
- **THEN** se guarda su valoración y el panel muestra el nuevo valor sin recargar la
  página

### Requirement: Estado en lugar de botones

Para cada señal en la que el usuario ya interactuó, el panel SHALL mostrar el estado
(no solo una acción): la valoración vigente con las estrellas llenas; "Escrita" y "Editar"
si ya tiene reseña; la cantidad de escuchas y la fecha de la última; favorito y Pendiente
activos; "Lo tienes" con el formato; "En tu búsqueda"; "En N de tus listas". Cada línea de
estado SHALL seguir siendo accionable (registrar otra escucha, editar, quitar, añadir a
otra lista). La acción de registrar escucha SHALL tener la misma etiqueta con o sin
escuchas previas.

#### Scenario: Usuario con escuchas y colección

- **WHEN** un usuario tiene 3 escuchas del álbum (la última el 12 de septiembre) y una
  copia en vinilo
- **THEN** el panel muestra la fila "Escuchas" con "3 · última 12 sep" y la acción
  "+ Registrar", y "Lo tienes · Vinilo"

#### Scenario: Usuario con reseña

- **WHEN** un usuario ya reseñó el álbum
- **THEN** la fila "Reseña" muestra "Escrita" y ofrece "Editar" en lugar de "Escribir
  reseña"

### Requirement: Estados del panel

El panel SHALL tener tres estados: **anónimo** — una invitación a iniciar sesión para
valorar, reseñar y registrar escuchas, sin controles que simulen poder hacerlo; **sin
interacción** — todas las filas visibles con sus acciones mínimas (estrellas vacías,
escribir reseña, registrar escucha, Favorito y Pendiente inactivos, agregar a la colección
y abrir el selector de listas); **con interacción** — el estado de cada señal según el
requisito anterior. El panel SHALL NOT esconder filas detrás de un menú `···` ni de una
acción "Más acciones".

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un álbum
- **THEN** el panel muestra la invitación a iniciar sesión y ningún control de escritura

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un álbum con el que nunca interactuó
- **THEN** el panel muestra todas las filas, incluidas colección y listas, sin ningún
  menú `···` ni "Más acciones"

### Requirement: Panel en móvil

En viewport móvil el panel SHALL mostrarse entre la identidad del álbum y las pestañas con
las mismas filas que en escritorio, en una sola columna y sin desbordamiento horizontal.
Las estrellas y los conmutadores SHALL tener un área táctil de al menos 40 px de alto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un álbum en móvil
- **THEN** ve nota, reseña, escuchas, Favorito, Pendiente, colección y listas sin abrir
  ningún menú, y puede valorar tocando las estrellas

## ADDED Requirements

### Requirement: Valoración en línea

La fila "Nota" SHALL mostrar cinco estrellas interactivas que admiten medias estrellas
(de ½ a 5). Elegir un valor SHALL guardarlo de inmediato, sin botón "Guardar", y mostrar
el nuevo valor sin recargar la página; si el guardado falla, SHALL restaurarse el valor
anterior y mostrarse un error. Antes de elegir, la previsualización SHALL seguir al puntero.
El control SHALL ser un grupo de opciones accesible por teclado (flechas para cambiar de
½ en ½) con el valor anunciado a lectores de pantalla.

#### Scenario: Media estrella con el puntero

- **WHEN** un usuario hace clic en la mitad izquierda de la cuarta estrella
- **THEN** se guarda una valoración de 3½ y las estrellas lo muestran

#### Scenario: Teclado

- **WHEN** un usuario enfoca las estrellas con 3 elegidas y pulsa la flecha derecha
- **THEN** la valoración pasa a 3½ y se guarda

#### Scenario: Error al guardar

- **WHEN** el guardado de una nueva valoración falla
- **THEN** las estrellas vuelven al valor anterior y el panel muestra el error

### Requirement: Puntaje detallado en diálogo

Junto a las estrellas, el panel SHALL ofrecer una acción compacta que muestra el puntaje
detallado vigente (o un indicador de "agregar" si no hay) y abre un diálogo modal con: el
puntaje detallado limitado al tramo coherente con las estrellas vigentes (½★ → 1–10,
1★ → 11–20 … 5★ → 91–100), destacar/quitar de destacadas y borrar la valoración. La
acción SHALL estar deshabilitada mientras no haya estrellas. El diálogo SHALL cerrarse con
Escape y devolver el foco a la acción que lo abrió.

#### Scenario: Tramo coherente

- **WHEN** un usuario con 4★ abre el diálogo de puntaje detallado
- **THEN** el diálogo solo acepta valores entre 71 y 80

#### Scenario: Sin estrellas

- **WHEN** un usuario todavía no valoró el álbum
- **THEN** la acción de puntaje detallado está deshabilitada

#### Scenario: Borrar la valoración

- **WHEN** un usuario confirma "Borrar nota" en el diálogo
- **THEN** se borran estrellas y puntaje detallado y las estrellas del panel quedan vacías

### Requirement: Cambio de estrellas con puntaje detallado

Cada valor de estrellas tiene su propio tramo de puntaje detallado, así que al cambiar las
estrellas el puntaje vigente deja de ser coherente. En ese caso el panel SHALL guardar la
valoración sin puntaje detallado y SHALL avisar de forma accesible qué puntaje se quitó,
para que el usuario pueda afinar de nuevo desde el diálogo.

#### Scenario: Puntaje incoherente

- **WHEN** un usuario con 5★ · 95 elige 3★
- **THEN** se guarda 3★ sin puntaje detallado y el panel avisa que se quitó el 95

### Requirement: Registro de escucha con confirmación

La acción "+ Registrar" de la fila "Escuchas" SHALL registrar una escucha, actualizar la
cantidad y la fecha de la última, y mostrar una confirmación visible ("Escucha
registrada") con una acción "Agregar detalles" que abre el formulario de esa entrada
(contexto, reacción, nota y audiencia). El formulario SHALL NOT abrirse sin que el usuario
lo pida.

#### Scenario: Registrar sin detalles

- **WHEN** un usuario con 2 escuchas pulsa "+ Registrar"
- **THEN** la fila muestra "3 · última" con la fecha de hoy, aparece "Escucha registrada"
  con "Agregar detalles" y no se abre ningún formulario

#### Scenario: Agregar detalles

- **WHEN** tras registrar el usuario pulsa "Agregar detalles"
- **THEN** se abre el formulario de la entrada recién registrada

### Requirement: Favorito y Pendiente como conmutadores

Favorito y Pendiente SHALL mostrarse como dos botones conmutadores contiguos, cada uno con
ícono y texto siempre visibles (corazón para Favorito, marcador para Pendiente; contorno
cuando está inactivo y relleno en ámbar cuando está activo), con `aria-pressed` reflejando
el estado. Pulsar el botón SHALL alternar la señal. El panel SHALL NOT mostrar acciones
"Agregar" ni "Quitar" para estas señales.

#### Scenario: Marcar Pendiente

- **WHEN** un usuario pulsa el botón Pendiente inactivo
- **THEN** el álbum queda en Pendiente, el marcador se rellena y el botón queda con
  `aria-pressed="true"`

#### Scenario: Registrar una escucha retira Pendiente

- **WHEN** un usuario con el álbum en Pendiente registra una escucha
- **THEN** el botón Pendiente pasa a inactivo

### Requirement: Listas desde el panel

La fila de listas SHALL mostrar "En N de tus listas", donde N cuenta las listas y Caminos
propios que el usuario gestiona a mano y que contienen el álbum, y una única acción que
abre el selector de listas (capability `album-list-picker`). El panel SHALL NOT ofrecer una
acción "Ver en listas" que muestre listas de la comunidad; esas listas se alcanzan desde el
bloque de comunidad. Al cerrar el selector, N SHALL reflejar los cambios hechos.

#### Scenario: Conteo actualizado

- **WHEN** un usuario con el álbum en 2 listas lo agrega a un Camino desde el selector y lo
  cierra
- **THEN** la fila muestra "En 3 de tus listas"

#### Scenario: Sin acción de listas de la comunidad

- **WHEN** un usuario autenticado mira la fila de listas
- **THEN** no hay ninguna acción "Ver en listas" en el panel
