## MODIFIED Requirements

### Requirement: Panel del dueño

La cabecera del perfil, vista por su dueño, SHALL mostrar bajo los recuentos una línea con el
número de solicitudes de seguimiento pendientes, enlazada a `/me/follow-requests`, cuando sea
mayor que cero, presentada como bandeja de entrada y no como métrica de logro. La vista del dueño
SHALL NOT incluir una tarjeta de acceso a los ajustes ni listar las superficies de biblioteca
(`/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection` y similares), que se alcanzan desde el
menú de usuario; el acceso a Privacidad y audiencia es la marca de visibilidad junto al nombre (ver
`profile-edit-mode`). La vista del dueño SHALL ofrecer una previsualización que muestre el perfil
tal como lo ve un visitante público y tal como lo ve un visitante no autorizado.

El conjunto de destinos de gestión de red y de cuenta (seguidores, seguidos, solicitudes de
seguimiento, cuentas bloqueadas y ajustes) enlazados por el área de ajustes y el conjunto
expuesto por el menú de usuario del Header SHALL derivarse de una única definición compartida, de
modo que ambos permanezcan sincronizados. La definición compartida PODRÁ marcar destinos que
correspondan solo a una de las dos superficies (por ejemplo, el enlace al propio perfil, propio
del menú del Header, o las cuentas bloqueadas, propias del área de ajustes).

#### Scenario: Solicitudes pendientes en el panel

- **WHEN** el dueño abre su perfil y tiene solicitudes de seguimiento pendientes
- **THEN** bajo los recuentos ve cuántas solicitudes tiene, con un enlace a `/me/follow-requests`,
  y la pantalla Red de los ajustes lo muestra junto al enlace a `/me/follow-requests`

#### Scenario: Sin solicitudes pendientes

- **WHEN** el dueño abre su perfil y no tiene solicitudes pendientes
- **THEN** la cabecera no muestra ninguna línea ni indicador numérico de solicitudes

#### Scenario: Previsualizar "cómo te ven"

- **WHEN** el dueño activa la previsualización de vista pública o de vista no autorizada
- **THEN** el perfil se re-renderiza con la composición correspondiente a esa relación, sin
  los controles de edición del dueño

#### Scenario: Panel y menú del Header comparten destinos

- **WHEN** se añade, quita o renombra un destino de red o de cuenta en la definición compartida
- **THEN** la pantalla Red de los ajustes y el menú de usuario del Header reflejan el mismo
  cambio sin edición por separado
