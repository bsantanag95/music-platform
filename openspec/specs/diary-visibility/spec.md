# diary-visibility Specification

## Purpose
TBD - created by archiving change add-diary-social-surfaces. Update Purpose after archive.
## Requirements
### Requirement: Visibilidad del diario ajeno

El sistema SHALL permitir leer las entradas del diario de un usuario distinto del propio de acuerdo
con la siguiente matriz de visibilidad: un visitante bloqueado por el dueño o que bloquea al dueño
SHALL NOT ver ninguna entrada; el dueño SHALL ver todas sus entradas; si el perfil del dueño es
privado y el visitante no es un seguidor aprobado, el visitante SHALL NOT ver ninguna entrada, ni
siquiera las de audiencia `public`; si el visitante es un seguidor aprobado, SHALL ver las entradas
de audiencia `public` y `followers`; en cualquier otro caso, SHALL ver únicamente las entradas de
audiencia `public`. Las entradas de audiencia `private` SHALL ser visibles solo para su dueño.

#### Scenario: El dueño lee su propio diario
- **WHEN** el dueño consulta su propio diario
- **THEN** ve todas sus entradas, incluida su audiencia y las privadas

#### Scenario: Visitante sin sesión frente a un perfil público
- **WHEN** un visitante sin sesión consulta el diario de un perfil público
- **THEN** ve únicamente las entradas de audiencia `public`

#### Scenario: Seguidor aprobado de un perfil público
- **WHEN** un seguidor aprobado consulta el diario de un perfil público
- **THEN** ve las entradas de audiencia `public` y `followers`, y ninguna `private`

#### Scenario: Perfil privado con seguidor aprobado
- **WHEN** un seguidor aprobado consulta el diario de un perfil privado
- **THEN** ve las entradas de audiencia `public` y `followers`, y ninguna `private`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta el diario de un perfil privado
- **THEN** no ve ninguna entrada, ni siquiera las de audiencia `public`

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ninguna entrada del diario del dueño

#### Scenario: Entrada privada ajena
- **WHEN** un visitante con acceso consulta el diario de otro usuario
- **THEN** las entradas de audiencia `private` del dueño no aparecen en la respuesta

### Requirement: Lectura del diario en el perfil ajeno

El sistema SHALL exponer la lectura paginada del diario de un usuario por `username` en el perfil,
en orden cronológico descendente, con la misma forma de respuesta que el diario propio
(`{ entries, page, pageSize, hasNext }`). Si el visitante no tiene permiso de ver entradas del
dueño, la respuesta SHALL ser una lista vacía y NO SHALL revelar si el usuario tiene entradas. Si el
`username` no existe, la respuesta SHALL ser `404` con código `USER_NOT_FOUND`.

#### Scenario: Perfil con entradas visibles
- **WHEN** un visitante con permiso consulta el diario de un usuario con entradas visibles
- **THEN** recibe las entradas visibles paginadas en orden cronológico descendente

#### Scenario: Sin permiso devuelve lista vacía
- **WHEN** un visitante sin permiso consulta el diario de un usuario
- **THEN** recibe una lista vacía sin indicar si el usuario tiene entradas

#### Scenario: Diario vacío
- **WHEN** un visitante con permiso consulta el diario de un usuario sin entradas
- **THEN** recibe una lista vacía con paginación válida

#### Scenario: Usuario inexistente
- **WHEN** se consulta el diario de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

