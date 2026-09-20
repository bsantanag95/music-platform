## MODIFIED Requirements

### Requirement: Perfil autenticado y configuración
El sistema SHALL permitir al usuario autenticado consultar su propio perfil y actualizar su
visibilidad y su nombre visible. La respuesta SHALL incluir el estado de seguimiento relevante
para el visitante cuando corresponda, sin exponer información de autenticación. El nombre visible
SHALL recortarse y, si queda vacío, SHALL guardarse como ausente para que el sitio muestre el
username en su lugar.

#### Scenario: Usuario actualiza su privacidad
- **WHEN** el usuario autenticado guarda un cambio de visibilidad válido
- **THEN** la configuración se persiste y la UI refleja el nuevo estado sin cerrar la sesión

#### Scenario: Visitante no autenticado intenta actualizar privacidad
- **WHEN** una request sin sesión intenta cambiar la visibilidad de un perfil
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica datos

#### Scenario: Usuario actualiza su nombre visible
- **WHEN** el usuario autenticado guarda un nombre visible válido
- **THEN** el nombre se persiste y las superficies que muestran su nombre reflejan el nuevo valor

### Requirement: Ruta canónica del perfil

El sistema SHALL servir el perfil de cualquier usuario, incluido el propio, en una única
ruta canónica basada en el username (`/users/{username}`). El sistema SHALL NOT exponer una
ruta de perfil separada para el dueño. Las superficies de gestión bajo `/me/*` SHALL
conservarse como destinos de gestión enlazados desde el área de ajustes (`/me/settings`) y
desde el menú de usuario.

#### Scenario: El dueño abre su propio perfil

- **WHEN** un usuario autenticado navega a `/users/{su-username}`
- **THEN** ve su perfil con las capas de dueño (barra del dueño con el interruptor "Editar
  perfil", tarjeta de acceso a Ajustes, elementos privados marcados, previsualización "cómo te
  ven"); los controles de edición aparecen solo al activar el modo edición

#### Scenario: Enlace al perfil propio desde otra superficie

- **WHEN** un usuario pulsa el acceso a "mi perfil" desde el Header o el Inicio
- **THEN** llega a `/users/{su-username}` y no a una ruta de perfil distinta

### Requirement: Panel del dueño

La vista del dueño SHALL incluir una tarjeta "Ajustes" que enlace al área de ajustes
(`/me/settings`) y muestre un indicador con el número de solicitudes de seguimiento pendientes
cuando sea mayor que cero, presentado como bandeja de entrada y no como métrica de logro. La
tarjeta SHALL NOT listar las superficies de biblioteca (`/me/diary`, `/me/favorites`,
`/me/lists`, `/me/collection` y similares), que se alcanzan desde el menú de usuario. La vista
del dueño SHALL ofrecer una previsualización que muestre el perfil tal como lo ve un visitante
público y tal como lo ve un visitante no autorizado.

El conjunto de destinos de gestión de red y de cuenta (seguidores, seguidos, solicitudes de
seguimiento, cuentas bloqueadas y ajustes) enlazados por el área de ajustes y el conjunto
expuesto por el menú de usuario del Header SHALL derivarse de una única definición compartida, de
modo que ambos permanezcan sincronizados. La definición compartida PODRÁ marcar destinos que
correspondan solo a una de las dos superficies (por ejemplo, el enlace al propio perfil, propio
del menú del Header, o las cuentas bloqueadas, propias del área de ajustes).

#### Scenario: Solicitudes pendientes en el panel

- **WHEN** el dueño abre su perfil y tiene solicitudes de seguimiento pendientes
- **THEN** la tarjeta "Ajustes" muestra el número de solicitudes pendientes y la pantalla Red de
  los ajustes lo muestra junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño abre su perfil y no tiene solicitudes pendientes
- **THEN** la tarjeta "Ajustes" no muestra ningún indicador numérico

#### Scenario: Previsualizar "cómo te ven"

- **WHEN** el dueño activa la previsualización de vista pública o de vista no autorizada
- **THEN** el perfil se re-renderiza con la composición correspondiente a esa relación, sin
  los controles de edición del dueño

#### Scenario: Panel y menú del Header comparten destinos

- **WHEN** se añade, quita o renombra un destino de red o de cuenta en la definición compartida
- **THEN** la pantalla Red de los ajustes y el menú de usuario del Header reflejan el mismo
  cambio sin edición por separado
