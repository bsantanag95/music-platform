## ADDED Requirements

### Requirement: Entidad reseña

El sistema SHALL persistir una reseña como una fila `review` con un autor (`user_id`),
exactamente un objetivo entre artista, álbum o canción —mediante tres columnas FK nullable
(`artist_id`, `release_group_id`, `recording_id`) y una restricción
`CHECK (num_nonnulls(...) = 1)`, la misma forma que `rating`, `comment`, `favorite` y
`listen_entry`—, un `title` **opcional** de 1 a 120 caracteres (nullable; el sistema SHALL
normalizar una cadena vacía a nulo), un `body` obligatorio de 1 a 10000 caracteres, y
marcas `created_at` / `updated_at`. El sistema SHALL NOT usar un identificador de objetivo
polimórfico sin FK.

Un usuario SHALL tener a lo sumo **una reseña vigente por objetivo** (índice único parcial
por columna de target, igual que `rating`). La reseña SHALL ser editable por su autor; no
es append-only.

El título SHALL presentarse como metadato secundario de la reseña —junto al autor y las
estrellas, no como encabezado— y SHALL omitirse por completo cuando es nulo.

#### Scenario: Reseña sobre un álbum

- **WHEN** un usuario autenticado con un rating propio sobre un álbum envía un título y un
  cuerpo válidos para ese álbum
- **THEN** el sistema crea la fila `review` asociada a ese usuario y ese `release_group`, y
  la devuelve en el listado del álbum

#### Scenario: Segunda reseña del mismo objetivo reemplaza a la primera

- **WHEN** un usuario que ya reseñó un álbum envía una reseña nueva para el mismo álbum
- **THEN** el sistema reemplaza el título y el cuerpo de su reseña vigente y no crea una
  segunda fila

#### Scenario: Reseña sin título

- **WHEN** un usuario con un rating propio sobre un álbum envía solo un cuerpo válido, sin
  título (o con título vacío)
- **THEN** el sistema crea la reseña con `title` nulo y el listado la muestra sin título

#### Scenario: Título o cuerpo fuera de rango

- **WHEN** un usuario envía una reseña con título de más de 120 caracteres, cuerpo vacío o
  cuerpo de más de 10000 caracteres
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ni modifica
  ninguna reseña

#### Scenario: Objetivo inexistente

- **WHEN** el objetivo de la reseña no corresponde a ningún artista, álbum ni canción
- **THEN** la API responde `404` con código `INVALID_TARGET` y no crea ninguna reseña

#### Scenario: Sesión requerida

- **WHEN** una petición sin sesión intenta crear, editar o borrar una reseña
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ninguna reseña

### Requirement: La reseña siempre lleva rating

El sistema SHALL exigir que exista un `rating` propio del autor sobre el objetivo para
crear o editar una reseña. La petición de escritura SHALL aceptar `stars` (0.5 a 5 en
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

### Requirement: Escritura de reseñas restringida a álbumes en esta versión

El sistema SHALL aceptar la creación y edición de reseñas únicamente cuando el objetivo es
un álbum (`release-group`). Para objetivos de tipo artista o canción, el sistema SHALL
responder `400` con código `REVIEW_TARGET_NOT_SUPPORTED` y un mensaje localizado que
indique que esas reseñas llegan más adelante. El **listado** de reseñas (`GET`) SHALL
responder normalmente para cualquier tipo de objetivo, devolviendo una lista vacía cuando
no hay reseñas. Esta restricción SHALL vivir en la capa de validación, no en el esquema:
la tabla `review` SHALL admitir las tres formas de objetivo desde su creación.

#### Scenario: Reseña de artista rechazada

- **WHEN** un usuario autenticado intenta crear una reseña sobre un artista
- **THEN** la API responde `400` con código `REVIEW_TARGET_NOT_SUPPORTED` y no crea
  ninguna fila

#### Scenario: Reseña de canción rechazada

- **WHEN** un usuario autenticado intenta crear una reseña sobre una canción
- **THEN** la API responde `400` con código `REVIEW_TARGET_NOT_SUPPORTED` y no crea
  ninguna fila

#### Scenario: Listado de reseñas de un objetivo no reseñable

- **WHEN** alguien consulta el listado de reseñas de un artista o una canción
- **THEN** la API responde `200` con una lista vacía y paginación válida, sin error

### Requirement: Listado de reseñas por objetivo

El sistema SHALL exponer un listado paginado de las reseñas de un objetivo
(`{ reviews, page, pageSize, hasNext }`), ordenado de la más reciente a la más antigua por
`created_at`. Cada entrada SHALL incluir el autor (`id`, `username`, `displayName`), el
título cuando existe (nulo en caso contrario), el cuerpo, el rating vigente del autor
sobre ese objetivo (estrellas y `detailedScore`, o nulo si el autor borró su rating
después de reseñar), y las fechas de creación y última edición. El listado SHALL ser público: cualquier visitante, con o sin
sesión, SHALL poder leerlo.

#### Scenario: Listar reseñas de un álbum

- **WHEN** alguien abre un álbum con varias reseñas
- **THEN** ve las reseñas de la más reciente a la más antigua, paginadas, cada una con su
  autor, su texto y las estrellas vigentes de ese autor

#### Scenario: Reseña cuyo autor borró su rating

- **WHEN** un autor borró su rating después de haber escrito la reseña
- **THEN** su reseña sigue apareciendo en el listado, con el rating en nulo

#### Scenario: Paginación inválida

- **WHEN** se solicita el listado con una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Edición y borrado físico de la reseña

El sistema SHALL permitir al autor editar el título y el cuerpo de su reseña (y,
opcionalmente, su rating asociado en el mismo request) y SHALL actualizar `updated_at`. El
sistema SHALL permitir al autor borrar su reseña mediante `DELETE` físico, sin columna
`deleted_at`, historial ni recuperación (ADR 0009). El borrado de la reseña SHALL NOT
crear, modificar ni eliminar el `rating` del autor sobre ese objetivo. Editar o borrar una
reseña ajena SHALL responder `403` con código `PERMISSION_DENIED` sin tocar la fila.

#### Scenario: Editar la reseña propia

- **WHEN** el autor cambia el título o el cuerpo de su reseña
- **THEN** la reseña queda actualizada y `updated_at` avanza

#### Scenario: Borrar la reseña propia no toca el rating

- **WHEN** el autor borra su reseña de un álbum que valoró con 4 estrellas
- **THEN** la reseña se elimina de forma permanente y el rating de 4 estrellas del autor
  sobre ese álbum permanece intacto

#### Scenario: Editar o borrar una reseña ajena

- **WHEN** un usuario intenta editar o borrar una reseña que no le pertenece
- **THEN** la API responde `403` con código `PERMISSION_DENIED` y la reseña no cambia

#### Scenario: Borrado en cascada por objetivo o autor

- **WHEN** se elimina del catálogo el objetivo de una reseña, o se elimina la cuenta de su
  autor
- **THEN** la reseña se elimina en cascada por la FK correspondiente
