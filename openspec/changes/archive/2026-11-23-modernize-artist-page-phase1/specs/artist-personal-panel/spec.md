## MODIFIED Requirements

### Requirement: Estados del panel del artista

El panel SHALL tener dos estados con sesión, como el del álbum: sin interacción (todas las filas con su acción mínima) y con
interacción (el estado de cada fila). Sin sesión, la página SHALL NOT mostrar el panel: en su lugar, la portada SHALL mostrar el
botón «Seguir a {artista}», que lleva al inicio de sesión como la invitación actual del panel, y una frase que explica para qué
sirve una cuenta, sin ningún control de escritura. El panel SHALL NOT esconder filas detrás de un menú `···` ni de "Más acciones".

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre un artista
- **THEN** la portada muestra «Seguir a {artista}» y la frase, sin el panel ni ningún control de escritura

#### Scenario: Seguir sin sesión

- **WHEN** una persona sin sesión pulsa «Seguir a {artista}»
- **THEN** llega a la página de inicio de sesión

#### Scenario: Primera visita autenticada

- **WHEN** un usuario autenticado abre un artista con el que nunca interactuó
- **THEN** el panel muestra las ocho filas sin ningún menú `···`

### Requirement: Panel del artista en móvil

En móvil el panel SHALL mostrarse después de la ficha de la portada y antes de la barra de pestañas, con las mismas filas que en
escritorio, en una sola columna y con conmutadores de al menos 40 px de alto.

#### Scenario: Panel compacto

- **WHEN** un usuario autenticado abre un artista en móvil
- **THEN** ve las ocho filas sin abrir ningún menú, entre la ficha y las pestañas
