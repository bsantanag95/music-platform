# activity-feed Specification

## Purpose

Feed de actividad de Fase 5: composición bajo demanda de las actividades visibles de los
usuarios seguidos — escuchas del diario, favoritos y eventos de listas — ordenadas
cronológicamente y filtradas por audiencia, perfil y bloqueos.

## Requirements

### Requirement: Feed de actividad de usuarios seguidos

El sistema SHALL exponer, para un usuario autenticado, un feed de actividad v1 compuesto por
las actividades visibles de los usuarios a los que sigue con relación aceptada: escuchas
(`listen_entry`), favoritos y eventos de listas (creación o actualización de metadatos). El
feed SHALL ordenar las actividades de la más reciente a la más antigua con paginación
(`{ entries, page, pageSize, hasNext }`) y SHALL aplicar la misma regla de visibilidad de
actividades ajenas que el perfil: cada actividad solo aparece si es visible para el lector
según audiencia, visibilidad del perfil del autor y bloqueos. Sin sesión, la petición SHALL
responder `401` con código `AUTH_REQUIRED`.

#### Scenario: Feed de un usuario con seguidos
- **WHEN** un usuario autenticado que sigue a otros con relación aceptada consulta su feed
- **THEN** ve las escuchas, favoritos y eventos de listas visibles de esos seguidos, ordenados
  de la más reciente a la más antigua y paginados

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión consulta el feed
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Seguido sin actividades visibles
- **WHEN** un seguido solo tiene actividades de audiencia `private` o no visibles para el
  lector
- **THEN** ninguna de esas actividades aparece en el feed

#### Scenario: Seguido con perfil privado y relación aprobada
- **WHEN** el lector sigue con relación aceptada a un perfil privado
- **THEN** el feed incluye las actividades `public` y `followers` de ese perfil

#### Scenario: Sin seguidos o feed vacío
- **WHEN** el usuario no sigue a nadie o ninguno de sus seguidos tiene actividades visibles
- **THEN** recibe una lista vacía con paginación válida, sin error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Alcance del feed v1

El feed v1 SHALL contener escuchas del diario, favoritos y eventos de listas publicadas, y SHALL
NOT contener ratings ni comentarios en este incremento. Un evento de lista SHALL generarse por
la creación de una lista o por la actualización de sus metadatos (título, descripción o
audiencia), no por cada ítem agregado o quitado. Cada entrada SHALL mostrarse con el autor
(username y displayName), el tipo de actividad, el objetivo y la fecha.

#### Scenario: Solo escuchas, favoritos y listas
- **WHEN** un seguido cambia un rating o publica un comentario sin registrar una actividad
  visible del diario, un favorito o una lista
- **THEN** ese evento no genera ninguna entrada en el feed

#### Scenario: Un evento por lista, no por ítem
- **WHEN** un seguido crea una lista y luego le agrega varios ítems
- **THEN** el feed muestra un único evento de creación de la lista y ningún evento por ítem

#### Scenario: Actualización de metadatos de una lista
- **WHEN** un seguido actualiza el título o la audiencia de una lista visible
- **THEN** el feed muestra un evento de actualización de la lista con la fecha de `updated_at`

#### Scenario: Identificación del autor
- **WHEN** el feed muestra una actividad de un seguido
- **THEN** la entrada incluye el `username` y `displayName` del autor para poder enlazar a su
  perfil

#### Scenario: Navegación al perfil del autor
- **WHEN** el lector interactúa con la entrada de un seguido
- **THEN** puede navegar al perfil del autor de la entrada