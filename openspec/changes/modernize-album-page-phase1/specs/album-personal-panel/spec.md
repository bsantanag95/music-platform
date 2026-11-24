## MODIFIED Requirements

### Requirement: Estados del panel

El panel SHALL tener dos estados con sesión: **sin interacción** — todas las filas visibles con sus acciones mínimas (estrellas
vacías, escribir reseña, registrar escucha, Favorito y Pendiente inactivos, agregar a la colección y abrir el selector de listas); y
**con interacción** — el estado de cada señal según el requisito anterior. Sin sesión, la página SHALL NOT mostrar el panel: en su
lugar, la portada SHALL mostrar el botón «Valorar este disco», que lleva al inicio de sesión, y una frase que explica para qué sirve
una cuenta, sin controles que simulen poder valorar. El panel SHALL NOT esconder filas detrás de un menú `···` ni de una acción
"Más acciones".

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un álbum
- **THEN** la portada muestra «Valorar este disco» y la frase, sin el panel ni ningún control de escritura

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un álbum con el que nunca interactuó
- **THEN** el panel muestra todas las filas, incluidas colección y listas, sin ningún
  menú `···` ni "Más acciones"

### Requirement: Panel en móvil

En viewport móvil el panel SHALL mostrarse después de la ficha y la comunidad de la portada y antes de las pestañas, con las mismas
filas que en escritorio, en una sola columna y sin desbordamiento horizontal. Las estrellas y los conmutadores SHALL tener un área
táctil de al menos 40 px de alto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un álbum en móvil
- **THEN** ve nota, reseña, escuchas, Favorito, Pendiente, colección y listas sin abrir
  ningún menú, y puede valorar tocando las estrellas
