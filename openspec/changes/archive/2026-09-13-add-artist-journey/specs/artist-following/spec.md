## MODIFIED Requirements

### Requirement: Sección "Exploración" del perfil

El perfil SHALL exponer una sección **"Exploración"** con los artistas que el dueño sigue,
presentados como rejilla (nombre + monograma/foto, enlace a la página del artista). La
sección SHALL renderizarse solo en los niveles de acceso **autorizado y dueño** y SHALL NOT
renderizarse cuando el dueño no sigue a ningún artista. SHALL ubicarse después de la huella
de gusto y antes de los estantes de contenido.

Cada artista seguido que además tenga un recorrido propio del dueño (capacidad
`artist-journey`) en estado **en curso** o **completo** SHALL mostrar, sobre su tarjeta, un
indicador discreto de ese estado. Un recorrido en estado **archivado**, o la ausencia de un
recorrido, SHALL NOT producir ningún indicador — no existe un estado "pendiente" ni una marca
de ausencia. La sección SHALL NOT mostrar ningún conteo agregado de recorridos (por ejemplo,
"N recorridos completados") en ningún punto de la cabecera del perfil o de la sección.

#### Scenario: Perfil con artistas seguidos

- **WHEN** un visitante autorizado abre un perfil cuyo dueño sigue a varios artistas
- **THEN** ve la sección "Exploración" con esos artistas, después de la huella de gusto

#### Scenario: Perfil sin artistas seguidos

- **WHEN** el dueño no sigue a ningún artista
- **THEN** la sección "Exploración" no aparece y el resto del perfil se compone sin
  espacios vacíos

#### Scenario: Visitante no autorizado

- **WHEN** un visitante no autorizado abre un perfil privado
- **THEN** no ve la sección "Exploración"

#### Scenario: Artista seguido con recorrido en curso

- **WHEN** un artista seguido por el dueño tiene un recorrido propio del dueño en estado en
  curso
- **THEN** su tarjeta en "Exploración" muestra el indicador de estado en curso

#### Scenario: Artista seguido con recorrido completo

- **WHEN** un artista seguido por el dueño tiene un recorrido propio del dueño en estado
  completo
- **THEN** su tarjeta en "Exploración" muestra el indicador de estado completo

#### Scenario: Artista seguido con recorrido archivado

- **WHEN** un artista seguido por el dueño tiene un recorrido propio del dueño archivado
- **THEN** su tarjeta en "Exploración" no muestra ningún indicador de recorrido

#### Scenario: Artista seguido sin recorrido

- **WHEN** un artista seguido por el dueño no tiene ningún recorrido activado
- **THEN** su tarjeta en "Exploración" no muestra ningún indicador de recorrido, y en
  particular no muestra un estado "pendiente"

#### Scenario: Sin conteo agregado de recorridos

- **WHEN** el dueño del perfil tiene varios recorridos completos entre sus artistas seguidos
- **THEN** ningún punto del perfil muestra un número total de recorridos completados
