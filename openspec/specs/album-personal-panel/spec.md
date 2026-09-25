# album-personal-panel Specification

## Purpose
Reunir en el panel "Tu relación" el estado del usuario con el álbum (escucha, valoración, colección, búsqueda, pendientes y listas) y sus acciones.

## Requirements
### Requirement: Panel "Tu relación"

La cabecera del álbum SHALL incluir un panel "Tu relación" que reúna todas las acciones
personales sobre el álbum: valoración propia (estrellas y puntaje detallado), reseña
propia, escuchas, favorito, Pendiente, colección, búsqueda y listas. La página SHALL NOT
mostrar estas acciones fuera del panel (salvo las acciones por pista de la tracklist).
La valoración propia SHALL editarse en el panel, no al pie de la página.

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
(no solo una acción): la valoración vigente; "Editar" si ya tiene reseña; la cantidad de
escuchas y la fecha de la última; favorito activo; "Lo tienes" con el formato; "En tu
búsqueda"; "En N de tus listas". Cada línea de estado SHALL seguir siendo accionable
(registrar otra escucha, editar, quitar, añadir a otra lista).

#### Scenario: Usuario con escuchas y colección

- **WHEN** un usuario tiene 3 escuchas del álbum (la última el 12 de septiembre) y una
  copia en vinilo
- **THEN** el panel muestra "3 escuchas · última 12 sep" con la acción de registrar otra, y
  "Lo tienes · Vinilo"

#### Scenario: Usuario con reseña

- **WHEN** un usuario ya reseñó el álbum
- **THEN** el panel ofrece "Editar" tu reseña en lugar de "Escribir reseña"

### Requirement: Estados del panel

El panel SHALL tener tres estados: **anónimo** — una invitación a iniciar sesión para
valorar, reseñar y registrar escuchas, sin controles que simulen poder hacerlo; **sin
interacción** — acciones mínimas (valorar, registrar escucha, Pendiente, favorito y un
menú `···` con colección y listas); **con interacción** — el estado de cada señal según
el requisito anterior.

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un álbum
- **THEN** el panel muestra la invitación a iniciar sesión y ningún control de escritura

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un álbum con el que nunca interactuó
- **THEN** el panel muestra las acciones mínimas y deja colección y listas en el menú `···`

### Requirement: Nombres de las señales de intención

El panel SHALL rotular la señal want-to-listen como **"Pendiente"** y la wishlist física
como **"En tu búsqueda"**, de modo que ninguna de las dos use el verbo "querer" y no
puedan confundirse entre sí.

#### Scenario: Ambas señales activas

- **WHEN** un usuario tiene el álbum en Pendiente y también en su búsqueda física
- **THEN** el panel muestra "Pendiente" en la zona de escucha y "En tu búsqueda" en la zona
  de colección

### Requirement: Panel en móvil

En viewport móvil el panel SHALL mostrarse entre la identidad del álbum y las pestañas, en
forma compacta: la valoración propia, la cantidad de escuchas, la acción de registrar
escucha, favorito y un menú `···` con el resto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un álbum en móvil
- **THEN** ve su valoración y escuchas en una línea y el resto de acciones en el menú `···`

