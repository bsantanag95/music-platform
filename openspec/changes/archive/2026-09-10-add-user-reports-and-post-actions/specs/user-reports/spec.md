## ADDED Requirements

### Requirement: Reportar un perfil de usuario

Un usuario autenticado SHALL poder reportar el perfil de otro usuario con un motivo, y ese reporte
SHALL alimentar la misma cola de moderación que los reportes de comentarios y reseñas.

#### Scenario: Usuario reporta un perfil
- **WHEN** un usuario autenticado envía un reporte con `targetType: "user"`, `targetId` y motivo
- **THEN** se crea un reporte pendiente con objetivo usuario, sin duplicar reportes pendientes del
  mismo autor sobre el mismo perfil

#### Scenario: Auto-reporte
- **WHEN** un usuario intenta reportar su propio perfil
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no crea el reporte

#### Scenario: Perfil inexistente
- **WHEN** se reporta un `targetId` que no corresponde a ningún usuario
- **THEN** la API responde `404` con `USER_NOT_FOUND`

### Requirement: Cola de moderación con reportes de perfil

La cola SHALL listar reportes de perfil con el estado, el motivo, el autor del reporte y el usuario
reportado, y SHALL permitir resolverlos/descartarlos con auditoría.

#### Scenario: Moderador revisa un reporte de perfil
- **WHEN** un moderador abre la cola con reportes de perfil
- **THEN** ve el usuario reportado enlazado a su perfil y puede resolver o descartar el reporte

#### Scenario: Resolución con auditoría
- **WHEN** un moderador resuelve un reporte de perfil
- **THEN** se registra una `moderation_action` con `report_resolve` y el `user_id` del objetivo