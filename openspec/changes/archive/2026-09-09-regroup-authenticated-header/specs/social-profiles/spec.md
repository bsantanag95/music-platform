## MODIFIED Requirements

### Requirement: Panel del dueño

La vista del dueño SHALL incluir un panel que resuma y enlace las superficies de gestión
(`/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection`, `/me/followers`,
`/me/following`, `/me/follow-requests`, `/me/blocks`, `/me/settings`). El panel SHALL
mostrar un indicador con el número de solicitudes de seguimiento pendientes cuando sea
mayor que cero, presentado como bandeja de entrada y no como métrica de logro. La vista del
dueño SHALL ofrecer una previsualización que muestre el perfil tal como lo ve un visitante
público y tal como lo ve un visitante no autorizado.

El conjunto de destinos de gestión enlazados por este panel y el conjunto expuesto por el
menú de usuario del Header SHALL derivarse de una única definición compartida, de modo que
ambos permanezcan sincronizados. La definición compartida PODRÁ marcar destinos que
correspondan solo a una de las dos superficies (por ejemplo, el enlace al propio perfil,
propio del menú del Header).

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

#### Scenario: Panel y menú del Header comparten destinos

- **WHEN** se añade, quita o renombra un destino de gestión en la definición compartida
- **THEN** el panel del dueño y el menú de usuario del Header reflejan el mismo cambio sin
  edición por separado
