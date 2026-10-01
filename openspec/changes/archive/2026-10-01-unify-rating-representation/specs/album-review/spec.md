## ADDED Requirements

### Requirement: Estrellas de la reseña con el control y la vista de estrellas
El compositor de reseñas SHALL pedir las estrellas (cuando el usuario aún no valoró el álbum)
con el control de selección de estrellas de `rating-display`, no con botones numéricos, y
seguirá exigiendo una elección antes de publicar. El índice de reseñas y el artículo de una
reseña SHALL mostrar las estrellas vigentes del autor como la fila de estrellas de
`rating-display`, con la media estrella dibujada. Esto no cambia qué se guarda: las estrellas
siguen viviendo solo en el `rating`.

#### Scenario: Reseñar sin valoración previa
- **WHEN** un usuario que no valoró el álbum abre el formulario de reseña
- **THEN** ve el control de cinco estrellas con media estrella, y no puede publicar hasta
  elegir un valor

#### Scenario: Reseñar con valoración previa
- **WHEN** un usuario que ya valoró el álbum con 4 estrellas abre el formulario de reseña
- **THEN** el formulario no vuelve a pedir estrellas y la reseña se muestra con esas 4

#### Scenario: Reseña con media estrella en el índice
- **WHEN** el índice de reseñas lista una reseña de 3,5 estrellas
- **THEN** la fila muestra tres estrellas llenas, una media y una vacía
