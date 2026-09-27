## MODIFIED Requirements

### Requirement: Estrellas visibles en la canción

La fila **Nota** SHALL mostrar siempre las cinco estrellas interactivas, con el mismo
comportamiento que la valoración en línea del álbum (medias estrellas, guardado inmediato,
restauración y error si falla, teclado y lectores de pantalla), y junto a ellas la acción
de puntaje detallado en diálogo con las mismas reglas que en el álbum. Cuando existe un
puntaje detallado, la acción SHALL mostrarlo con su escala ("88/100"), igual que en el panel
del álbum. La valoración SHALL usar el contrato de rating existente con objetivo `recording`.
La nota SHALL NOT quedar detrás de una divulgación.

#### Scenario: Valorar una canción

- **WHEN** un usuario elige 4½ estrellas en el panel de una canción
- **THEN** se guarda su valoración de la grabación y el panel muestra el nuevo valor sin
  recargar la página

#### Scenario: Nota visible de entrada

- **WHEN** un usuario que nunca valoró la canción abre su página
- **THEN** ve las cinco estrellas vacías, sin abrir ninguna divulgación

#### Scenario: Puntaje detallado con escala

- **WHEN** un usuario tiene 4½ estrellas y un puntaje detallado de 88 sobre la canción
- **THEN** junto a las estrellas ve "88/100"

### Requirement: Escucha con reacción e historial en una línea

La fila **Escuchas** SHALL ofrecer "Registrar escucha", que abre el formulario del diario
donde se elige la reacción cualitativa (`liked` / `loved` / `obsessed` / `neutral` /
`disliked`). La fila SHALL ocupar dos líneas fijas: arriba, la etiqueta "Escuchas" y la
acción; abajo, a la izquierda, la cantidad, la reacción de la última escucha (si tiene) y su
fecha ("3 · última: Obsesión, 12 sep"), y a la derecha el enlace a su diario. Sin escuchas,
la línea de abajo SHALL decir "Ninguna" y SHALL NOT ofrecer el enlace. Ninguna línea SHALL
terminar en un separador suelto. La página SHALL NOT mostrar una sección aparte de historial
de escuchas. La acción SHALL tener la misma etiqueta con o sin escuchas previas.

#### Scenario: Usuario con escuchas

- **WHEN** un usuario registró 3 escuchas de la canción, la última el 12 de septiembre con
  reacción "obsessed"
- **THEN** la fila muestra arriba "Escuchas" y "Registrar escucha", y abajo "3 · última:
  Obsesión, 12 sep" y "Ver en tu diario"

#### Scenario: Registrar con reacción

- **WHEN** un usuario registra una escucha desde el panel eligiendo "loved"
- **THEN** la entrada del diario guarda esa reacción y la fila se actualiza sin recargar
  la página

### Requirement: Favorita y listas de la canción

La fila **Favorita** SHALL ser una fila compacta del panel, con la etiqueta a la izquierda y
un conmutador a la derecha que refleja y cambia el favorito de la grabación, con el mismo
ritmo que las demás filas (sin botón de ancho completo). La fila **Listas** SHALL mostrar "En
N de tus listas" cuando la grabación está en listas propias y abrir el mismo selector de
listas con casillas que el álbum, filtrado a listas de canciones.

#### Scenario: Marcar favorita

- **WHEN** un usuario activa Favorita en el panel
- **THEN** la grabación queda en sus favoritos y el conmutador queda activo sin recargar

#### Scenario: Agregar a una lista

- **WHEN** un usuario marca una de sus listas de canciones en el selector
- **THEN** la grabación se agrega a esa lista y la fila pasa a "En 1 de tus listas"
