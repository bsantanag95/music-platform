## MODIFIED Requirements

### Requirement: Escucha con reacción e historial en una línea

La fila **Escuchas** SHALL ofrecer "Registrar escucha", que abre el formulario del diario
donde se elige la reacción cualitativa (`liked` / `loved` / `obsessed` / `neutral` /
`disliked`). La fila SHALL ocupar dos líneas fijas, como las filas del panel del álbum:
arriba, la etiqueta "Escuchas" y la acción en gris; abajo, a la izquierda, la cantidad, la
reacción de la última escucha (si tiene) y su fecha ("3 · última: Obsesión, 12 sep"), y a
la derecha el enlace a su diario. Sin escuchas, la línea de abajo SHALL decir "Sin
escuchas", atenuada, y SHALL NOT ofrecer el enlace. Ninguna línea SHALL terminar en un
separador suelto. La página SHALL NOT mostrar una sección aparte de historial de escuchas.
La acción SHALL tener la misma etiqueta con o sin escuchas previas.

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

**Favorita** SHALL ser un conmutador en la parte superior del panel, a todo el ancho, con
el mismo estilo que los conmutadores Favorito y Pendiente del panel del álbum, que refleja
y cambia el favorito de la grabación. La fila **Listas** SHALL rotularse "Listas", con la
acción "Elegir listas" en gris junto a la etiqueta y debajo el estado ("En ninguna de tus
listas" atenuado, o "En N de tus listas"), y abrir el mismo selector de listas con casillas
que el álbum, filtrado a listas de canciones.

#### Scenario: Marcar favorita

- **WHEN** un usuario activa Favorita en el panel
- **THEN** la grabación queda en sus favoritos y el conmutador queda activo sin recargar

#### Scenario: Agregar a una lista

- **WHEN** un usuario marca una de sus listas de canciones en el selector
- **THEN** la grabación se agrega a esa lista y la fila pasa a "En 1 de tus listas"
