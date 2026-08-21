# user-following

## Purpose

Seguimiento unilateral entre usuarios, con solicitudes y aprobación para perfiles privados, y
gestión de seguidores, seguidos y solicitudes.

## Requirements

### Requirement: Seguimiento unilateral
El sistema SHALL permitir que un usuario autenticado siga o deje de seguir a otro usuario. La
relación SHALL ser unilateral, única por pareja y SHALL impedir que un usuario se siga a sí mismo.

#### Scenario: Seguir perfil público
- **WHEN** un usuario autenticado sigue un perfil público no bloqueado
- **THEN** se crea una relación aceptada y el estado cambia a `Siguiendo`

#### Scenario: Dejar de seguir
- **WHEN** un usuario que sigue a otra persona elige dejar de seguirla
- **THEN** la relación aceptada se elimina y el estado cambia a `Seguir`

### Requirement: Solicitudes para perfiles privados
El sistema SHALL crear una solicitud pendiente al seguir un perfil privado. El propietario SHALL
poder aprobar o rechazar la solicitud, y el solicitante SHALL poder cancelarla. Aprobar SHALL crear
una relación aceptada; rechazar o cancelar SHALL eliminar la solicitud.

#### Scenario: Solicitud a perfil privado
- **WHEN** un usuario sigue un perfil privado no bloqueado
- **THEN** se crea una solicitud `pending` y el solicitante ve `Solicitud enviada`

#### Scenario: Propietario aprueba solicitud
- **WHEN** el propietario aprueba una solicitud pendiente
- **THEN** la relación pasa a `accepted` y el solicitante puede acceder al contenido permitido a
  seguidores

#### Scenario: Propietario rechaza solicitud
- **WHEN** el propietario rechaza una solicitud pendiente
- **THEN** la solicitud se elimina y no se crea relación de seguimiento

### Requirement: Gestión de relaciones
El sistema SHALL permitir al usuario consultar sus seguidores, las personas que sigue y sus
solicitudes recibidas o enviadas. Cada listado SHALL respetar privacidad, bloqueo, paginación y
locale de la UI.

#### Scenario: Consultar solicitudes recibidas
- **WHEN** un usuario autenticado abre sus solicitudes recibidas
- **THEN** ve únicamente solicitudes pendientes dirigidas a su cuenta con acciones aprobar y
  rechazar

#### Scenario: Consultar seguidores
- **WHEN** un usuario abre su listado de seguidores
- **THEN** ve las relaciones aceptadas visibles para ese usuario y puede eliminar un seguidor propio

### Requirement: Estado de seguimiento en búsqueda y perfil
La API y la UI SHALL exponer un estado estable de relación: `Seguir`, `Solicitud enviada`,
`Siguiendo` o una acción de gestión para solicitudes recibidas. Las mutaciones SHALL actualizar ese
estado sin requerir recargar toda la aplicación.

#### Scenario: Usuario ya sigue el perfil
- **WHEN** el usuario consulta búsqueda o perfil de una persona que sigue
- **THEN** ve el estado `Siguiendo` y la acción `Dejar de seguir`

#### Scenario: Solicitud recibida
- **WHEN** el usuario consulta un perfil con una solicitud pendiente recibida
- **THEN** ve acciones para aprobar o rechazar la solicitud