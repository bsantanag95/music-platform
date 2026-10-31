## ADDED Requirements

### Requirement: Índice de reseñas del álbum como lista

La pestaña Reseñas SHALL listar cada reseña con el monograma del autor, su titular (el
título o, sin título, un extracto del cuerpo) enlazado a la reseña, el autor, la fecha y
la nota. Cuando la reseña tiene título SHALL mostrar además hasta dos líneas del cuerpo.
El orden, la paginación y la apertura en modal SHALL mantenerse. Sin reseñas visibles, la
pestaña SHALL mostrar un estado vacío con título y descripción.

#### Scenario: Reseña con título

- **WHEN** una reseña se titula "Perfection" y su cuerpo tiene varios párrafos
- **THEN** la fila muestra "Perfection" enlazado, el autor, la fecha, la nota y las dos
  primeras líneas del cuerpo

#### Scenario: Reseña sin título

- **WHEN** una reseña no tiene título
- **THEN** el titular es el extracto del cuerpo y no se repite debajo

#### Scenario: Álbum sin reseñas

- **WHEN** un álbum no tiene reseñas visibles
- **THEN** la pestaña muestra el estado vacío "Todavía no hay reseñas de este álbum"

### Requirement: Formulario de reseña plegado

Para un usuario autenticado sin reseña propia del álbum, el formulario de reseña SHALL
empezar plegado tras una invitación con la acción "Escribir reseña". Esa acción, el
enlace del panel "Tu relación" y la llegada a `#your-review` SHALL abrirlo y enfocar el
cuerpo. El formulario SHALL limitarse al ancho de lectura de la página.

#### Scenario: Pestaña Reseñas sin reseña propia

- **WHEN** un usuario autenticado sin reseña propia abre la pestaña Reseñas
- **THEN** ve la invitación con "Escribir reseña" y no ve los campos del formulario

#### Scenario: Escribir desde la invitación

- **WHEN** pulsa "Escribir reseña"
- **THEN** el formulario se abre con el foco en el cuerpo de la reseña
