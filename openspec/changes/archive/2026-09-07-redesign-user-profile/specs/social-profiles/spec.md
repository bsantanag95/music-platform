## MODIFIED Requirements

### Requirement: Perfil público y perfil privado

El sistema SHALL exponer un perfil por identificador público estable, como username. Un
perfil SHALL mostrar siempre su **identidad extendida**: nombre visible, username,
pronombres, ubicación, "miembro desde", bio, enlaces externos y los contadores de
seguidores y de seguidos.

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
- **AND** no ve su huella de gusto, destacados, himno, diario, favoritos, listas, colección
  ni sus listados de seguidores o seguidos

#### Scenario: Seguidor aprobado consulta perfil privado

- **WHEN** un seguidor con relación aceptada abre el perfil privado que sigue
- **THEN** ve la misma composición que un visitante de un perfil público, limitada a las
  actividades cuya audiencia lo alcanza

## ADDED Requirements

### Requirement: Ruta canónica del perfil

El sistema SHALL servir el perfil de cualquier usuario, incluido el propio, en una única
ruta canónica basada en el username (`/users/{username}`). El sistema SHALL NOT exponer una
ruta de perfil separada para el dueño. Las superficies de gestión bajo `/me/*` SHALL
conservarse como destinos de gestión enlazados desde el perfil.

#### Scenario: El dueño abre su propio perfil

- **WHEN** un usuario autenticado navega a `/users/{su-username}`
- **THEN** ve su perfil con las capas de dueño (edición inline, panel de gestión,
  elementos privados marcados, previsualización "cómo te ven")

#### Scenario: Enlace al perfil propio desde otra superficie

- **WHEN** un usuario pulsa el acceso a "mi perfil" desde el Header o el Inicio
- **THEN** llega a `/users/{su-username}` y no a una ruta de perfil distinta

### Requirement: Composición del perfil por nivel de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado. La huella, los destacados, el himno y los estantes de
contenido SHALL renderizarse solo en los niveles autorizado y dueño.

#### Scenario: Perfil privado sin autorización

- **WHEN** se compone la vista de un perfil privado para un visitante sin autorización
- **THEN** se muestran la identidad extendida, el aviso de perfil privado y la acción de
  seguir o solicitar, y nada más

#### Scenario: Estante de contenido vacío

- **WHEN** un visitante autorizado abre un perfil cuyo diario, favoritos, listas o
  colección no tienen elementos visibles
- **THEN** ese estante no se muestra y el resto del perfil se compone sin espacios vacíos

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  destacados ni estantes

### Requirement: Panel del dueño

La vista del dueño SHALL incluir un panel que resuma y enlace las superficies de gestión
(`/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection`, `/me/followers`,
`/me/following`, `/me/follow-requests`, `/me/blocks`, `/me/settings`). El panel SHALL
mostrar un indicador con el número de solicitudes de seguimiento pendientes cuando sea
mayor que cero, presentado como bandeja de entrada y no como métrica de logro. La vista del
dueño SHALL ofrecer una previsualización que muestre el perfil tal como lo ve un visitante
público y tal como lo ve un visitante no autorizado.

#### Scenario: Solicitudes pendientes en el panel

- **WHEN** el dueño abre su perfil y tiene solicitudes de seguimiento pendientes
- **THEN** el panel muestra el número de solicitudes pendientes y enlaza a
  `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño abre su perfil y no tiene solicitudes pendientes
- **THEN** el panel no muestra ningún indicador numérico junto a "Solicitudes"

#### Scenario: Previsualizar "cómo te ven"

- **WHEN** el dueño activa la previsualización de vista pública o de vista no autorizada
- **THEN** el perfil se re-renderiza con la composición correspondiente a esa relación, sin
  los controles de edición del dueño
