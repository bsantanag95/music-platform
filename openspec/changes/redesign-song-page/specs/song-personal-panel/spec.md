## ADDED Requirements

### Requirement: Panel "Tu relación" de la canción

La cabecera de la canción SHALL incluir un panel "Tu relación" que reúna todas las acciones
personales sobre la grabación, en este orden: **Nota** (estrellas y puntaje detallado),
**Escuchas**, **Favorita** y **Listas**. La página SHALL NOT mostrar estas acciones fuera
del panel. El panel SHALL NOT ofrecer reseña, Pendiente ni colección. Las filas SHALL
rotularse sin el posesivo, como en el panel del álbum.

#### Scenario: Acciones reunidas

- **WHEN** un usuario autenticado abre una canción
- **THEN** todas sus acciones sobre la canción están en el panel y no hay botones sueltos
  en la página

#### Scenario: Sin reseña ni Pendiente

- **WHEN** un usuario autenticado abre una canción
- **THEN** el panel no ofrece escribir una reseña, marcarla como Pendiente ni agregarla a
  la colección

### Requirement: Estrellas visibles en la canción

La fila **Nota** SHALL mostrar siempre las cinco estrellas interactivas, con el mismo
comportamiento que la valoración en línea del álbum (medias estrellas, guardado inmediato,
restauración y error si falla, teclado y lectores de pantalla), y junto a ellas la acción
de puntaje detallado en diálogo con las mismas reglas que en el álbum. La valoración SHALL
usar el contrato de rating existente con objetivo `recording`. La nota SHALL NOT quedar
detrás de una divulgación.

#### Scenario: Valorar una canción

- **WHEN** un usuario elige 4½ estrellas en el panel de una canción
- **THEN** se guarda su valoración de la grabación y el panel muestra el nuevo valor sin
  recargar la página

#### Scenario: Nota visible de entrada

- **WHEN** un usuario que nunca valoró la canción abre su página
- **THEN** ve las cinco estrellas vacías, sin abrir ninguna divulgación

### Requirement: Escucha con reacción e historial en una línea

La fila **Escuchas** SHALL ofrecer "Registrar escucha", que abre el formulario del diario
donde se elige la reacción cualitativa (`liked` / `loved` / `obsessed` / `neutral` /
`disliked`). Cuando el usuario tiene escuchas de la grabación, la fila SHALL mostrar en una
línea la cantidad, la reacción de la última escucha (si tiene) y su fecha, con un enlace a
su diario. La página SHALL NOT mostrar una sección aparte de historial de escuchas. La
acción SHALL tener la misma etiqueta con o sin escuchas previas.

#### Scenario: Usuario con escuchas

- **WHEN** un usuario registró 3 escuchas de la canción, la última el 12 de septiembre con
  reacción "obsessed"
- **THEN** la fila muestra "3 escuchas · última: obsesión, 12 sep", un enlace a su diario y
  la acción "Registrar escucha"

#### Scenario: Registrar con reacción

- **WHEN** un usuario registra una escucha desde el panel eligiendo "loved"
- **THEN** la entrada del diario guarda esa reacción y la fila se actualiza sin recargar
  la página

### Requirement: Favorita y listas de la canción

La fila **Favorita** SHALL ser un conmutador que refleja y cambia el favorito de la
grabación. La fila **Listas** SHALL mostrar "En N de tus listas" cuando la grabación está en
listas propias y abrir el mismo selector de listas con casillas que el álbum, filtrado a
listas de canciones.

#### Scenario: Marcar favorita

- **WHEN** un usuario activa Favorita en el panel
- **THEN** la grabación queda en sus favoritos y el conmutador queda activo sin recargar

#### Scenario: Agregar a una lista

- **WHEN** un usuario marca una de sus listas de canciones en el selector
- **THEN** la grabación se agrega a esa lista y la fila pasa a "En 1 de tus listas"

### Requirement: Estados del panel de la canción

El panel SHALL tener tres estados, como el del álbum: **anónimo** — invitación a iniciar
sesión, sin controles de escritura; **sin interacción** — todas las filas con sus acciones
mínimas; **con interacción** — el estado de cada señal. En móvil SHALL mostrarse entre la
identidad y la ficha técnica, con las mismas filas, en una columna y con áreas táctiles de
al menos 40 px de alto para estrellas y conmutadores.

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre una canción
- **THEN** el panel muestra la invitación a iniciar sesión y ningún control de escritura

#### Scenario: Móvil

- **WHEN** un usuario autenticado abre una canción en móvil
- **THEN** ve Nota, Escuchas, Favorita y Listas sin abrir ningún menú
