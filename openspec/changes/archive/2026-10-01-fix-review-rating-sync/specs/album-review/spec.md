## MODIFIED Requirements

### Requirement: La reseña siempre lleva rating

El sistema SHALL exigir que exista un `rating` propio del autor sobre el objetivo para
crear una reseña; editar una reseña ya existente NO requiere rating (ver "Edición y
borrado físico de la reseña"). La petición de escritura SHALL aceptar `stars` (0.5 a 5 en
pasos de 0.5) y `detailedScore` (1 a 100, coherente con las estrellas) opcionales; cuando
se envían, el sistema SHALL hacer upsert del `rating` del autor con las mismas reglas de
validación que el endpoint de rating, dentro de la misma transacción que la escritura de
la reseña. Cuando no se envían `stars` y el autor no tiene un `rating` previo sobre el
objetivo, el sistema SHALL responder `400` con código `REVIEW_REQUIRES_RATING` y no
escribir nada. La reseña SHALL NOT almacenar las estrellas: el `rating` es la única fuente
de verdad y el listado de reseñas SHALL exponer el rating vigente del autor junto a cada
reseña.

#### Scenario: Crear reseña con estrellas en el mismo request

- **WHEN** un usuario sin rating previo sobre un álbum envía título, cuerpo y `stars: 4.5`
- **THEN** el sistema crea el `rating` de 4.5 estrellas y la reseña en una sola operación,
  y el listado muestra la reseña con 4.5 estrellas

#### Scenario: Crear reseña sin estrellas cuando ya existe rating

- **WHEN** un usuario que ya valoró un álbum con 4 estrellas envía solo título y cuerpo
- **THEN** el sistema crea la reseña y la muestra con las 4 estrellas vigentes

#### Scenario: Crear reseña sin estrellas y sin rating previo

- **WHEN** un usuario sin rating sobre un álbum envía solo título y cuerpo
- **THEN** la API responde `400` con código `REVIEW_REQUIRES_RATING` y no crea la reseña
  ni ningún rating

#### Scenario: Estrellas incoherentes con la valoración detallada

- **WHEN** una petición de reseña envía `stars` y `detailedScore` fuera de la banda de 10
  puntos correspondiente
- **THEN** la API responde `400` con código `INVALID_RATING` y no escribe la reseña ni el
  rating

#### Scenario: El rating mostrado es el vigente

- **WHEN** un usuario reseña un álbum con 3 estrellas y luego cambia su rating a 5 por el
  endpoint de rating
- **THEN** su reseña se muestra con 5 estrellas, sin haber tocado la reseña

#### Scenario: Editar una reseña sin rating

- **WHEN** un autor que borró su rating después de reseñar edita el título o el cuerpo de su
  reseña sin enviar `stars`
- **THEN** el sistema actualiza la reseña y no responde `REVIEW_REQUIRES_RATING`

## ADDED Requirements

### Requirement: El compositor no sobrescribe la valoración vigente
El compositor de reseñas SHALL enviar `stars` únicamente cuando está mostrando el selector
de estrellas, es decir, cuando el usuario no tiene reseña ni valoración vigente sobre el
álbum. Cuando el usuario ya tiene una valoración vigente (porque la creó antes o la creó o
cambió desde el panel "Tu relación" durante la sesión), el compositor NO SHALL enviar un
valor de estrellas elegido antes, y publicar la reseña NO SHALL modificar ni el valor de la
valoración ni su puntaje detallado.

#### Scenario: Valorar en el panel después de elegir estrellas en el compositor
- **WHEN** un usuario sin valoración elige 3 estrellas en el compositor sin publicar, luego
  valora el álbum con 5 estrellas en el panel "Tu relación" y después publica la reseña
- **THEN** la reseña se publica sin enviar estrellas y la valoración del usuario sigue en 5
  estrellas, con su puntaje detallado si lo tenía

#### Scenario: Reseñar sin valoración previa
- **WHEN** un usuario sin valoración elige 4 estrellas en el compositor y publica la reseña
- **THEN** se crea la valoración de 4 estrellas junto con la reseña

#### Scenario: Valoración borrada después de elegir estrellas
- **WHEN** un usuario con valoración vigente la borra desde el panel y el compositor vuelve a
  mostrar el selector
- **THEN** el compositor exige elegir estrellas antes de poder publicar una reseña nueva
