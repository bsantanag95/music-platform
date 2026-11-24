## ADDED Requirements

### Requirement: Reseñas vacías en un solo bloque

La pestaña Reseñas de un álbum sin reseñas SHALL mostrar un único bloque que dice que todavía nadie reseñó el disco e incluye la acción
que corresponde: sin sesión, el enlace para iniciar sesión y reseñar; con sesión y sin reseña propia, "Escribir reseña", que abre el
formulario. La pestaña SHALL NOT repetir debajo una segunda invitación. Con reseñas, la invitación SHALL seguir debajo del índice.

#### Scenario: Sin reseñas y sin sesión

- **WHEN** una persona sin sesión abre la pestaña Reseñas de un álbum sin reseñas
- **THEN** ve un solo bloque «Todavía nadie reseñó este disco» con «Inicia sesión para reseñar», sin otra invitación debajo

#### Scenario: Sin reseñas y con sesión

- **WHEN** un usuario autenticado sin reseña propia abre esa pestaña
- **THEN** el bloque ofrece "Escribir reseña" y al pulsarlo se abre el formulario con el foco en el cuerpo

#### Scenario: Con reseñas

- **WHEN** el álbum tiene reseñas
- **THEN** la pestaña muestra el índice y, debajo, la invitación de siempre
