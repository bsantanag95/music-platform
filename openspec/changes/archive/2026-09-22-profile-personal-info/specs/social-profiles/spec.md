## MODIFIED Requirements

### Requirement: Perfil público y perfil privado

El sistema SHALL exponer un perfil por identificador público estable, como username. Un
perfil SHALL mostrar siempre su **identidad extendida**: nombre visible, username,
"miembro desde", bio, enlaces externos y los contadores de seguidores y de seguidos. Los
pronombres, el país y la ciudad o región SHALL mostrarse solo a quien tiene acceso al perfil
(el dueño, cualquier visitante de un perfil público y un seguidor aprobado de uno privado; ver
`profile-personal-info`).

Un perfil **público** SHALL mostrar además su huella de gusto, sus destacados, su himno y
sus actividades y listas con audiencia compatible con el visitante.

Un perfil **privado** consultado por un visitante no autorizado (anónimo, sin relación
aceptada, o con solicitud pendiente) SHALL mostrar únicamente la identidad extendida y
SHALL NOT exponer su huella de gusto, sus destacados, su himno, sus actividades, ni sus
listados sociales (seguidores, seguidos, diario, favoritos, listas, colección).

Ninguna vista del perfil SHALL incluir conteos de progreso, elementos pendientes de
valorar, rachas ni medallas de completitud.

#### Scenario: Visitante consulta perfil público

- **WHEN** un visitante abre un perfil público
- **THEN** ve la identidad extendida, la huella de gusto, los destacados y el contenido
  permitido por la audiencia de cada elemento

#### Scenario: Visitante consulta perfil privado

- **WHEN** un visitante que no sigue a un usuario con relación aceptada abre su perfil
  privado
- **THEN** ve su identidad extendida (incluidos bio, enlaces y contadores de
  seguidores/seguidos) y un aviso de perfil privado
- **AND** no ve sus pronombres, país ni ciudad, ni su huella de gusto, destacados, himno,
  diario, favoritos, listas, colección ni sus listados de seguidores o seguidos

#### Scenario: Seguidor aprobado consulta perfil privado

- **WHEN** un seguidor con relación aceptada abre el perfil privado que sigue
- **THEN** ve la misma composición que un visitante de un perfil público, limitada a las
  actividades cuya audiencia lo alcanza
