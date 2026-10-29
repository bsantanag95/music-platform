## ADDED Requirements

### Requirement: Acceso a las solicitudes desde las conexiones propias

Cuando el dueño tiene solicitudes de seguimiento pendientes, la cabecera de sus Seguidos y Seguidores SHALL incluir
una pestaña "Solicitudes" con cuántas son, que lleve a su bandeja de solicitudes. Sin pendientes, la pestaña SHALL NOT
mostrarse.

#### Scenario: Con solicitudes pendientes

- **WHEN** el dueño con 2 solicitudes pendientes abre sus Seguidos
- **THEN** la cabecera muestra la pestaña "Solicitudes 2", que lleva a la bandeja

#### Scenario: Sin solicitudes

- **WHEN** el dueño sin solicitudes pendientes abre sus Seguidores
- **THEN** la cabecera no muestra la pestaña "Solicitudes"
