## MODIFIED Requirements

### Requirement: Estados del panel de la canción

El panel SHALL tener dos estados con sesión, como el del álbum: **sin interacción** — todas las filas con sus acciones mínimas; **con
interacción** — el estado de cada señal. Con sesión, el panel SHALL ir fuera de la tarjeta, en la columna derecha del cuerpo encima
de «En el disco», con su caja propia. Sin sesión, la página SHALL NOT mostrar el panel: en su lugar, la columna lateral de la tarjeta
SHALL mostrar el botón «Valorar esta canción», que lleva al inicio de sesión, y una frase que explica para qué sirve una cuenta (oculta
en móvil), sin controles que simulen poder valorar. En móvil el panel SHALL mostrarse justo después de la tarjeta, con las mismas
filas, en una columna y con áreas táctiles de al menos 40 px de alto para estrellas y conmutadores.

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre una canción
- **THEN** la tarjeta muestra «Valorar esta canción» y la frase, sin el panel ni ningún control de escritura

#### Scenario: Móvil

- **WHEN** un usuario autenticado abre una canción en móvil
- **THEN** ve Nota, Escuchas, Favorita y Listas sin abrir ningún menú, justo después de la tarjeta
