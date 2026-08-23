# activity-feed Specification

## Purpose
TBD - created by archiving change add-diary-social-surfaces. Update Purpose after archive.
## Requirements
### Requirement: Feed de diario de usuarios seguidos

El sistema SHALL exponer, para un usuario autenticado, un feed de actividad v1 compuesto
exclusivamente por las entradas del diario (`listen_entry`) de los usuarios a los que sigue con
relación aceptada, en orden cronológico descendente y con paginación (`{ entries, page, pageSize,
hasNext }`). El feed SHALL aplicar la misma regla de visibilidad de entradas ajenas que el perfil:
cada entrada solo aparece si es visible para el lector según audiencia, visibilidad del perfil del
autor y bloqueos. Sin sesión, la petición SHALL responder `401` con código `AUTH_REQUIRED`.

#### Scenario: Feed de un usuario con seguidos
- **WHEN** un usuario autenticado que sigue a otros con relación aceptada consulta su feed
- **THEN** ve las entradas de diario visibles de esos seguidos, ordenadas de la más reciente a la
  más antigua y paginadas

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión consulta el feed
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Seguido sin entradas visibles
- **WHEN** un seguido solo tiene entradas de audiencia `private` o no visibles para el lector
- **THEN** ninguna de esas entradas aparece en el feed

#### Scenario: Seguido con perfil privado y relación aprobada
- **WHEN** el lector sigue con relación aceptada a un perfil privado
- **THEN** el feed incluye las entradas `public` y `followers` de ese perfil

#### Scenario: Sin seguidos o feed vacío
- **WHEN** el usuario no sigue a nadie o ninguno de sus seguidos tiene entradas visibles
- **THEN** recibe una lista vacía con paginación válida, sin error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Alcance del feed v1

El feed v1 SHALL contener únicamente entradas del diario de escucha. Ratings, comentarios,
favoritos y listas NO SHALL aparecer en el feed en este incremento. Las entradas SHALL mostrarse con
el autor (username y displayName), el objetivo, el contexto, la impresión, la reacción y la fecha.

#### Scenario: Solo entradas del diario
- **WHEN** un seguido cambia un rating o publica un comentario sin registrar una escucha visible
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: Identificación del autor
- **WHEN** el feed muestra una entrada de un seguido
- **THEN** la entrada incluye el `username` y `displayName` del autor para poder enlazar a su perfil

#### Scenario: Navegación al perfil del autor
- **WHEN** el lector interactúa con la entrada de un seguido
- **THEN** puede navegar al perfil del autor de la entrada

