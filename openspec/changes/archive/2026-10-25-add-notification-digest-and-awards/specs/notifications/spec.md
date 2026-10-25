## ADDED Requirements

### Requirement: Premios de artistas seguidos

Al cargar una ceremonia de premios, el sistema SHALL crear para cada persona con cuenta activa que sigue a un artista
nominado (como sujeto de la nominación o como artista principal del disco o la canción nominados) una notificación
`artist_award_nomination` si la ceremonia es de competencia y se celebra en el futuro o se celebró en los últimos 30
días, y una `artist_award_win` si se celebró en los últimos 30 días y alguno de esos artistas ganó, o si es una clase
de Salón de la Fama del año en curso que lo incluye. Cada persona SHALL recibir a lo sumo una notificación por
ceremonia y tipo, aunque siga a varios nominados o la carga se repita. Una ceremonia fuera de esa ventana SHALL NOT
generar avisos. Un fallo al avisar SHALL NOT invalidar la carga del premio.

#### Scenario: Banda seguida nominada

- **WHEN** Ana sigue a una banda y se carga una ceremonia de los Grammy del año próximo con tres nominaciones suyas
- **THEN** Ana tiene en "Novedades" una sola entrada "*Banda* tiene 3 nominaciones en los Grammy *año*"

#### Scenario: Ganó

- **WHEN** la ceremonia se celebró hace una semana y la carga marca ganadora una de esas nominaciones
- **THEN** Ana recibe además "*Banda* ganó 1 premio en los Grammy *año*"

#### Scenario: Historia cargada

- **WHEN** se cargan las ceremonias de 2021 a 2025
- **THEN** no se crea ninguna notificación de premios

#### Scenario: Carga repetida

- **WHEN** `load-awards` corre dos veces con los mismos archivos
- **THEN** no se crean notificaciones nuevas

#### Scenario: Ingreso a un Salón de la Fama

- **WHEN** la clase de este año de un Salón de la Fama incluye un disco de un artista que Ana sigue
- **THEN** Ana recibe "*Artista* entró al Salón de la Fama de *premio*" y ninguna notificación de nominación

### Requirement: Lectura de los avisos de premios

Una entrada de premios SHALL calcularse al leer desde las nominaciones actuales de la ceremonia: los artistas
seguidos involucrados, cuántas nominaciones o premios suman y el artista con más, para que una corrección de los
datos se refleje sin reescribir avisos. Si después de una corrección ya no queda ningún artista seguido en la
ceremonia, la entrada SHALL NOT mostrarse. La entrada SHALL enlazar a la página de la ceremonia.

#### Scenario: Varios artistas seguidos

- **WHEN** Ana sigue a dos artistas nominados en la misma ceremonia
- **THEN** ve una sola entrada que nombra al de más nominaciones y suma "y 1 artista más"

#### Scenario: Corrección de nominaciones

- **WHEN** una recarga quita la única nominación del artista que Ana sigue
- **THEN** la entrada de esa ceremonia deja de mostrarse

## MODIFIED Requirements

### Requirement: Preferencias de notificación

La persona SHALL poder activar o desactivar por separado `comment_reply`, `thread_reply`, `new_follower`,
`follow_accepted`, `comment_like_milestone`, `list_save_milestone`, `artist_release`, `artist_release_announced`,
`artist_single` y `artist_award` (que gobierna los dos tipos de premios). SHALL nacer activados `comment_reply`, `thread_reply`, `new_follower`, `follow_accepted`,
`comment_like_milestone`, `artist_release` y `artist_award`; SHALL nacer desactivados `list_save_milestone`,
`artist_release_announced` y `artist_single`. Sin preferencia guardada, cada tipo SHALL usar su valor por defecto. `follow_request` y `moderation` SHALL NOT poder desactivarse. Una
preferencia SHALL aplicar a las notificaciones posteriores y SHALL NOT borrar las existentes.

#### Scenario: Desactivar un tipo

- **WHEN** Ana desactiva "Respuestas en hilos donde participaste"
- **THEN** deja de recibir `thread_reply` y conserva las que ya tenía

#### Scenario: Intentar desactivar moderación

- **WHEN** una petición intenta desactivar `moderation`
- **THEN** la API responde `400` con código `VALIDATION_ERROR`

#### Scenario: Tipo desactivado por defecto

- **WHEN** Ana nunca tocó sus preferencias y alguien guarda su lista
- **THEN** no recibe `list_save_milestone`

#### Scenario: Activar los sencillos

- **WHEN** Ana activa "Sencillos de artistas que sigues" y un artista que sigue saca un sencillo
- **THEN** recibe `artist_single` en "Novedades"

#### Scenario: Desactivar los premios

- **WHEN** Ana desactiva "Premios de artistas que sigues"
- **THEN** deja de recibir `artist_award_nomination` y `artist_award_win`

### Requirement: Pestañas "Para ti" y "Novedades"

El panel de la campana y la página `/me/notifications` SHALL separar las entradas en dos pestañas: "Para ti" (por
defecto: respuestas, seguimientos, moderación e hitos) y "Novedades" (lanzamientos, anunciados, sencillos y premios de
artistas seguidos). Las pestañas SHALL exponerse como `tablist` accesible. Abrir "Novedades" SHALL marcar vistas sus
entradas sin marcarlas leídas.

#### Scenario: Cambiar a Novedades

- **WHEN** Ana abre la campana y elige "Novedades"
- **THEN** ve los lanzamientos de sus artistas seguidos con su carátula y el punto de la pestaña desaparece

#### Scenario: Novedades vacía

- **WHEN** Ana no sigue a ningún artista
- **THEN** "Novedades" muestra un estado vacío que explica que ahí aparecerán los discos de los artistas que sigue

#### Scenario: Premios en Novedades

- **WHEN** un artista que Ana sigue queda nominado en una ceremonia recién cargada
- **THEN** el aviso aparece en "Novedades" y no suma al contador de la campana
