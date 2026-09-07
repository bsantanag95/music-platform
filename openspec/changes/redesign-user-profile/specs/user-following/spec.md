## ADDED Requirements

### Requirement: Conteo de solicitudes de seguimiento pendientes

El sistema SHALL exponer al usuario autenticado el número de solicitudes de seguimiento
pendientes dirigidas a su cuenta, para su uso en indicadores de navegación como el panel de
su perfil. El conteo SHALL contar únicamente solicitudes `pending` dirigidas al usuario y
SHALL NOT incluir solicitudes enviadas por el usuario ni relaciones aceptadas o rechazadas.

#### Scenario: Usuario con solicitudes pendientes

- **WHEN** un usuario autenticado con dos solicitudes de seguimiento pendientes consulta su
  conteo
- **THEN** el conteo es `2`

#### Scenario: Usuario sin solicitudes pendientes

- **WHEN** un usuario autenticado sin solicitudes pendientes dirigidas a su cuenta consulta
  su conteo
- **THEN** el conteo es `0`

#### Scenario: Visitante sin sesión

- **WHEN** una petición sin sesión intenta consultar el conteo de solicitudes pendientes
- **THEN** la API responde `401` con código `AUTH_REQUIRED`
