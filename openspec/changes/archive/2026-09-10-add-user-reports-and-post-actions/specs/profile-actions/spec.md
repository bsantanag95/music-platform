## ADDED Requirements

### Requirement: Reportar y suspender desde el perfil

El perfil de un usuario SHALL ofrecer reportar al dueño del perfil a cualquier usuario autenticado y,
solo a moderadores, suspender su actividad social con expiración y motivo.

#### Scenario: Usuario reporta un perfil desde su página
- **WHEN** un usuario autenticado visita el perfil de otra persona y confirma un reporte con motivo
- **THEN** se crea un reporte pendiente de perfil con el mismo endpoint de reportes

#### Scenario: Moderador suspende desde el perfil
- **WHEN** un visitante con `moderation.suspend_social` confirma una suspensión con expiración futura
  y motivo desde el perfil
- **THEN** se crea la restricción `social_activity` mediante el endpoint de restricciones

#### Scenario: Usuario normal no ve la suspensión
- **WHEN** un usuario sin `moderation.suspend_social` visita un perfil
- **THEN** solo ve la acción de reportar, nunca la de suspender

#### Scenario: Bloquear desde el perfil
- **WHEN** un usuario autenticado confirma bloquear al dueño del perfil
- **THEN** el bloqueo se aplica mediante el endpoint existente de bloqueo