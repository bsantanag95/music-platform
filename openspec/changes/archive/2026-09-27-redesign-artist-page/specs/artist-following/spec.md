## MODIFIED Requirements

### Requirement: Estado de seguimiento en la página de artista

La página de detalle de un artista SHALL mostrar un control de **seguir / siguiendo** en el
panel "Tu relación" de la cabecera, reflejando si el usuario en sesión sigue a ese artista.
Un visitante sin sesión SHALL ver en su lugar la invitación a iniciar sesión del panel. El
control SHALL NOT mostrar un conteo de seguidores; la cantidad de seguidores SHALL mostrarse
solo en el bloque de comunidad del artista, con el umbral mínimo de la capability
`artist-community-stats`.

#### Scenario: Usuario autenticado que no sigue

- **WHEN** un usuario autenticado abre la página de un artista que no sigue
- **THEN** ve un control "Seguir" que, al activarlo, pasa a "Siguiendo"

#### Scenario: Usuario autenticado que ya sigue

- **WHEN** un usuario autenticado abre la página de un artista que sigue
- **THEN** el control aparece en estado "Siguiendo" y permite dejar de seguir

#### Scenario: Visitante sin sesión

- **WHEN** una persona sin sesión abre la página de un artista
- **THEN** ve una invitación a iniciar sesión en lugar del control de seguir

#### Scenario: Conteo de seguidores en el bloque de comunidad

- **WHEN** 120 personas siguen al artista
- **THEN** el bloque de comunidad muestra "Lo siguen 120" y el control de seguir no muestra
  ninguna cifra
