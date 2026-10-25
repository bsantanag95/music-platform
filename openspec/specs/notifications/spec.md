# notifications Specification

## Purpose
Bandeja de notificaciones in-app del usuario (Fase 1): respuestas a un tema propio y en hilos donde se participó, nuevos seguidores, solicitudes y aceptaciones de seguimiento y avisos de moderación; emisión única en la transacción de la acción, retracción por cascada, filtros de privacidad al leer, agrupación, contador visto / leído, campana del Header, página `/me/notifications`, preferencias por tipo, retención y su API.
## Requirements
### Requirement: Notificación por respuesta a un tema propio

Cuando una persona responde a un comentario raíz de artista (directamente o respondiendo a una de sus respuestas),
el sistema SHALL crear una notificación `comment_reply` para el autor de la raíz, en la misma transacción que la
respuesta. El sistema SHALL NOT notificar al autor de la raíz por sus propias respuestas.

#### Scenario: Respuesta a un tema ajeno

- **WHEN** Bruno responde al tema que Ana abrió en la página de un artista
- **THEN** Ana tiene una notificación `comment_reply` con Bruno como actor y la respuesta como objeto

#### Scenario: Respuesta propia

- **WHEN** Ana responde en su propio tema
- **THEN** no se crea ninguna notificación para Ana

#### Scenario: La respuesta falla

- **WHEN** la creación de la respuesta es rechazada (bloqueo, raíz oculta, validación)
- **THEN** no se crea ninguna notificación

### Requirement: Notificación por respuesta en un hilo donde se participó

Cuando una persona responde en un hilo, el sistema SHALL crear una notificación `thread_reply` para cada autor
distinto de respuestas visibles anteriores del mismo hilo, excepto el autor de la raíz (que recibe `comment_reply`)
y quien responde. El tipo SHALL estar activado por defecto.

#### Scenario: Participante previo

- **WHEN** Carla respondió antes en el tema de Ana y luego Bruno responde
- **THEN** Carla tiene una notificación `thread_reply` y Ana una `comment_reply`, una sola cada una

#### Scenario: Autora de la raíz que también respondió

- **WHEN** Ana respondió en su propio hilo y luego Bruno responde
- **THEN** Ana recibe solo la `comment_reply`, no además una `thread_reply`

### Requirement: Notificaciones de seguimiento

El sistema SHALL crear, en la misma transacción que la operación de seguimiento:

- `new_follower` para el seguido cuando un seguimiento queda `accepted` al seguir un perfil público;
- `follow_request` para el dueño cuando el seguimiento queda `pending` sobre un perfil privado;
- `follow_accepted` para quien pidió cuando el dueño aprueba la solicitud, y en ese momento SHALL retirar la
  `follow_request` correspondiente del dueño.

#### Scenario: Seguir un perfil público

- **WHEN** Bruno sigue el perfil público de Ana
- **THEN** Ana tiene una notificación `new_follower` con Bruno como actor

#### Scenario: Solicitud a un perfil privado

- **WHEN** Bruno pide seguir el perfil privado de Ana
- **THEN** Ana tiene una notificación `follow_request` con Bruno como actor

#### Scenario: Aprobar la solicitud

- **WHEN** Ana aprueba la solicitud de Bruno
- **THEN** Bruno tiene una notificación `follow_accepted`
- **AND** la notificación `follow_request` de Ana ya no existe

### Requirement: Notificaciones de moderación

El sistema SHALL crear una notificación `moderation` para el autor o dueño del contenido cuando un moderador oculta o
restaura su comentario, reseña o lista, y para la persona afectada cuando se aplica o se revoca su suspensión social.
La notificación SHALL mostrar la acción, el objeto y el motivo registrado, y SHALL NOT identificar al moderador. La
notificación SHALL mostrarse aunque el contenido esté oculto.

#### Scenario: Comentario ocultado

- **WHEN** un moderador oculta un comentario de Ana con el motivo "Spam"
- **THEN** Ana tiene una notificación de moderación que nombra el comentario oculto y el motivo "Spam"
- **AND** la notificación no muestra quién moderó

#### Scenario: Suspensión revocada

- **WHEN** un moderador revoca la suspensión social de Ana
- **THEN** Ana tiene una notificación de moderación que indica que puede volver a publicar

### Requirement: Reglas comunes de emisión

El sistema SHALL emitir toda notificación a través de un único servicio, que SHALL NOT notificar a una persona por
sus propias acciones, SHALL NOT notificar cuando existe un bloqueo en cualquier dirección entre actor y destinatario,
SHALL respetar las preferencias del destinatario y SHALL NOT duplicar una notificación por el mismo objeto y tipo.

#### Scenario: Bloqueo previo

- **WHEN** Ana bloqueó a Bruno y Bruno responde en un hilo donde Ana participó
- **THEN** Ana no recibe ninguna notificación

#### Scenario: Tipo desactivado

- **WHEN** Ana desactivó "Nuevos seguidores" y Bruno la sigue
- **THEN** no se crea ninguna notificación `new_follower` para Ana

### Requirement: Retracción de notificaciones

Una notificación SHALL desaparecer cuando deja de existir su objeto: borrar la respuesta, dejar de seguir, quitar un
seguidor, rechazar o cancelar una solicitud, bloquear (que elimina los seguimientos) o eliminar la cuenta del actor o
del destinatario.

#### Scenario: Dejar de seguir

- **WHEN** Bruno sigue a Ana y luego deja de seguirla
- **THEN** Ana ya no tiene la notificación `new_follower` de Bruno

#### Scenario: Borrar la respuesta

- **WHEN** Bruno borra su respuesta en el tema de Ana
- **THEN** Ana ya no tiene la notificación de esa respuesta

#### Scenario: Cancelar la solicitud

- **WHEN** Bruno cancela su solicitud al perfil privado de Ana
- **THEN** Ana ya no tiene la notificación `follow_request`

### Requirement: Filtros de privacidad en la lectura

Al leer la bandeja o su contador, el sistema SHALL excluir las notificaciones cuyo actor tenga la cuenta desactivada
o mantenga un bloqueo en cualquier dirección con el lector, y las de respuestas ocultas por moderación o cuya raíz
esté oculta. Las notificaciones `moderation` SHALL quedar fuera de estos filtros. Restaurar un contenido o desbloquear
SHALL volver a mostrar las notificaciones afectadas que sigan existiendo.

#### Scenario: Actor desactivado

- **WHEN** Bruno respondió a Ana y luego desactivó su cuenta
- **THEN** la bandeja y el contador de Ana no incluyen esa notificación

#### Scenario: Respuesta restaurada

- **WHEN** la respuesta de Bruno fue ocultada y luego restaurada por moderación
- **THEN** la notificación de Ana vuelve a aparecer

### Requirement: Agrupación

La bandeja SHALL agrupar las notificaciones de respuestas del mismo hilo en una sola entrada y los nuevos seguidores
del mismo día (en la zona horaria del lector) en una sola entrada, mostrando hasta dos nombres y el resto como
cifra. Las solicitudes de seguimiento, las solicitudes aceptadas y las de moderación SHALL NOT agruparse. Las
entradas SHALL ordenarse por su evento más reciente.

#### Scenario: Varias respuestas en un hilo

- **WHEN** Bruno, Carla y Diego responden en el tema de Ana
- **THEN** Ana ve una sola entrada del estilo "Diego, Carla y 1 persona más respondieron a tu tema"

#### Scenario: Seguidores de días distintos

- **WHEN** dos personas siguen a Ana hoy y una ayer
- **THEN** Ana ve dos entradas de seguidores, una por día

### Requirement: Contador, visto y leído

El sistema SHALL mostrar un contador de entradas no leídas de la pestaña "Para ti" creadas después de la última vez que la persona abrió la
bandeja, con tope visible "9+", y SHALL ponerlo a cero al abrir la campana o la página de notificaciones. Cada entrada
SHALL permanecer sin leer hasta que la persona abre su destino o marca todas como leídas. El contador SHALL
presentarse como bandeja de entrada y SHALL NOT mostrarse en el título de la pestaña ni acompañarse de sonidos,
avisos emergentes, email o push. Las entradas de "Novedades" (lanzamientos de artistas seguidos) SHALL NOT sumar
al contador: la pestaña "Novedades" SHALL mostrar un punto sin cifra cuando tiene entradas no leídas posteriores a la
última vez que la persona abrió esa pestaña.

#### Scenario: Abrir la campana

- **WHEN** Ana tiene 3 entradas nuevas y abre la campana
- **THEN** el contador pasa a 0 y las 3 entradas siguen marcadas como no leídas

#### Scenario: Abrir una entrada

- **WHEN** Ana abre la entrada de respuestas de un hilo
- **THEN** llega al hilo en la página del artista y la entrada queda leída

#### Scenario: Muchas entradas

- **WHEN** Ana tiene 14 entradas nuevas
- **THEN** el contador muestra "9+"

#### Scenario: Un lanzamiento no suma al contador

- **WHEN** Ana no tiene nada nuevo en "Para ti" y sale un álbum de un artista que sigue
- **THEN** el contador de la campana sigue en 0 y la pestaña "Novedades" muestra un punto

#### Scenario: Abrir Novedades

- **WHEN** Ana abre la pestaña "Novedades"
- **THEN** el punto desaparece y los lanzamientos siguen sin leer hasta que abre su disco

### Requirement: Campana y panel en el Header

Con sesión, el Header SHALL mostrar un control de notificaciones con el contador. En escritorio, el control SHALL
abrir con clic o teclado un panel con las últimas 10 entradas, "Marcar todas como leídas" y "Ver todas"; SHALL
cerrarse con `Escape` devolviendo el foco y al navegar, y SHALL exponer `aria-expanded`, `aria-controls` y una
etiqueta accesible que incluya el número sin ver. Por debajo de `lg`, el control SHALL ser un enlace a
`/me/notifications`. El contador SHALL actualizarse sin recargar la página al menos una vez por minuto mientras la
pestaña está visible.

#### Scenario: Abrir el panel en escritorio

- **WHEN** Ana hace clic en la campana en escritorio
- **THEN** ve sus últimas entradas y los accesos "Marcar todas como leídas" y "Ver todas"

#### Scenario: Campana en móvil

- **WHEN** Ana toca la campana en un viewport de 375 px
- **THEN** llega a `/me/notifications`

#### Scenario: Nueva notificación con la página abierta

- **WHEN** Ana deja una página abierta y Bruno la sigue
- **THEN** en menos de dos minutos el contador de Ana se actualiza sin recargar

### Requirement: Página de notificaciones

El sistema SHALL ofrecer `/me/notifications` con las entradas paginadas, la acción "Marcar todas como leídas", un
acceso a los ajustes de notificaciones y un estado vacío. Una entrada `follow_request` SHALL ofrecer Aprobar y
Rechazar en la misma fila; al resolverse, la entrada SHALL desaparecer. Una petición sin sesión SHALL ser dirigida al
inicio de sesión.

#### Scenario: Aprobar desde la bandeja

- **WHEN** Ana aprueba una solicitud desde su fila en la bandeja
- **THEN** el seguimiento queda aceptado y la fila desaparece

#### Scenario: Bandeja vacía

- **WHEN** Ana no tiene notificaciones
- **THEN** ve un estado vacío que explica qué aparecerá ahí

### Requirement: Preferencias de notificación

La persona SHALL poder activar o desactivar por separado `comment_reply`, `thread_reply`, `new_follower`,
`follow_accepted`, `comment_like_milestone`, `list_save_milestone`, `artist_release`, `artist_release_announced` y
`artist_single`. SHALL nacer activados `comment_reply`, `thread_reply`, `new_follower`, `follow_accepted`,
`comment_like_milestone` y `artist_release`; SHALL nacer desactivados `list_save_milestone`,
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

### Requirement: Retención

El sistema SHALL borrar las notificaciones leídas de más de 90 días y cualquier notificación de más de 180 días de
cada persona, sin depender de un proceso operativo manual.

#### Scenario: Notificación antigua leída

- **WHEN** Ana tiene una notificación leída hace 100 días y abre su bandeja
- **THEN** esa notificación deja de existir

### Requirement: API de notificaciones

El sistema SHALL exponer, solo con sesión, `GET /api/me/notifications` (entradas agrupadas con cursor),
`GET /api/me/notifications/count`, `PUT /api/me/notifications/seen`, `POST /api/me/notifications/read` (por claves
de entrada o todas) y `GET|PUT /api/me/notification-preferences`. Una petición sin sesión SHALL recibir `401` con
código `AUTH_REQUIRED`. Ninguna respuesta SHALL incluir notificaciones de otra persona.

#### Scenario: Sin sesión

- **WHEN** una petición sin sesión consulta `GET /api/me/notifications/count`
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Marcar de otra persona

- **WHEN** Bruno envía a `POST /api/me/notifications/read` una clave de entrada de Ana
- **THEN** ninguna notificación de Ana cambia de estado

### Requirement: Hitos de likes de un comentario propio

Cuando un like nuevo hace que un comentario (raíz o respuesta) alcance un hito, el sistema SHALL crear una
notificación `comment_like_milestone` para su autor, en la misma transacción que el like, sin actor ni nombres. Los
hitos SHALL ser 10, 25, 50, 100, 500, 1000, 2500, 5000, 10000 y luego cada 10000. El conteo SHALL seguir la regla de
la cifra pública de likes (sin cuentas desactivadas). El sistema SHALL avisar solo el hito que cruza el like nuevo:
un hito que el comentario ya había pasado sin aviso (antes de que existieran los hitos o con el tipo desactivado)
SHALL NOT avisarse con retraso. Un hito SHALL avisarse una sola vez por comentario: quitar un like no lo retira y volver a dar like no lo
repite.

#### Scenario: Décimo like

- **WHEN** el comentario de Ana recibe su décimo like
- **THEN** Ana tiene una notificación "Tu comentario sobre *Artista* llegó a 10 me gusta" que no nombra a nadie

#### Scenario: Like sin hito

- **WHEN** el comentario de Ana pasa de 10 a 11 likes
- **THEN** no se crea ninguna notificación

#### Scenario: Quitar y volver a dar like

- **WHEN** el comentario baja de 10 a 9 likes y vuelve a 10
- **THEN** Ana conserva una sola notificación del hito 10

#### Scenario: Hito ya pasado

- **WHEN** el comentario de Ana ya tenía 15 likes antes de existir los hitos y recibe uno nuevo
- **THEN** no recibe el hito 10 con retraso; su próximo aviso es el 25

### Requirement: Hitos de guardados de una lista propia

Cuando una persona nueva guarda una lista o un Camino propio (incluido activar su seguimiento de progreso), el
sistema SHALL crear una notificación `list_save_milestone` para el dueño si el número de personas distintas con
cuenta activa que la guardaron alcanza un hito: 1, 5, 10, 25, 50, 100, 500, 1000 y luego cada 1000. Las mismas reglas
de una sola vez y del hito que cruza el guardado nuevo que en los likes SHALL aplicar. Cambiar `following` o `tracking` de un guardado
existente SHALL NOT contar como guardado nuevo.

#### Scenario: Primera persona que guarda

- **WHEN** Ana activó los avisos de guardados y Bruno guarda su lista
- **THEN** Ana recibe "Tu lista *Título* ya la guardó 1 persona" sin el nombre de Bruno

#### Scenario: Seguir una lista ya guardada

- **WHEN** Bruno ya había guardado la lista y ahora activa seguirla
- **THEN** no se crea ninguna notificación

### Requirement: Lanzamientos de artistas seguidos

Al sincronizar el calendario de lanzamientos, el sistema SHALL crear una notificación `artist_release` para cada
persona con cuenta activa que sigue a un artista con crédito principal en un álbum o EP del calendario, vinculado al
catálogo, sin exclusiones y con fecha verificada dentro de los últimos 14 días; `artist_release_announced` para los álbumes y EP
que tienen fecha futura; y `artist_single` para los sencillos de esos artistas publicados en los últimos 14 días (un
sencillo por salir SHALL NOT avisarse como anunciado), que SHALL NOT entrar al riel de
Inicio. Cada persona SHALL recibir a lo sumo una notificación por disco y tipo, aunque siga a varios de sus artistas
o la sincronización se repita. Un aviso SHALL NOT exigir carátula. Un fallo al avisar SHALL NOT invalidar la
sincronización del calendario.

#### Scenario: Sale el álbum de una banda seguida

- **WHEN** Ana sigue a una banda y el calendario sincroniza su álbum publicado hace 2 días
- **THEN** Ana tiene una notificación `artist_release` en "Novedades" que enlaza a la página del disco

#### Scenario: Colaboración entre dos artistas seguidos

- **WHEN** Ana sigue a los dos artistas acreditados de un EP
- **THEN** recibe una sola notificación por ese EP

#### Scenario: Sincronización repetida

- **WHEN** el calendario se sincroniza al día siguiente con el mismo disco
- **THEN** no se crea una segunda notificación

#### Scenario: Disco viejo en la ventana

- **WHEN** el disco de un artista seguido salió hace 20 días
- **THEN** no se crea `artist_release`

#### Scenario: Reedición o en vivo

- **WHEN** el disco del artista seguido es una reedición o tiene tipo secundario
- **THEN** no se crea ninguna notificación

### Requirement: Pestañas "Para ti" y "Novedades"

El panel de la campana y la página `/me/notifications` SHALL separar las entradas en dos pestañas: "Para ti" (por
defecto: respuestas, seguimientos, moderación e hitos) y "Novedades" (lanzamientos, anunciados y sencillos de
artistas seguidos). Las pestañas SHALL exponerse como `tablist` accesible. Abrir "Novedades" SHALL marcar vistas sus
entradas sin marcarlas leídas.

#### Scenario: Cambiar a Novedades

- **WHEN** Ana abre la campana y elige "Novedades"
- **THEN** ve los lanzamientos de sus artistas seguidos con su carátula y el punto de la pestaña desaparece

#### Scenario: Novedades vacía

- **WHEN** Ana no sigue a ningún artista
- **THEN** "Novedades" muestra un estado vacío que explica que ahí aparecerán los discos de los artistas que sigue

### Requirement: Agrupación y lectura de hitos y lanzamientos

Los hitos del mismo comentario o de la misma lista SHALL mostrarse como una sola entrada con el hito más alto. Los
lanzamientos SHALL NOT agruparse. Una entrada de hito SHALL desaparecer si su comentario o su lista queda oculto por
moderación o se borra, y una de lanzamiento si su disco se borra o queda fuera de la discografía del artista.

#### Scenario: Dos hitos del mismo comentario

- **WHEN** el comentario de Ana alcanzó 10 y luego 25 likes
- **THEN** la bandeja muestra una sola entrada con "25 me gusta"

#### Scenario: Lista oculta

- **WHEN** un moderador oculta la lista de Ana que tenía un hito de guardados
- **THEN** el hito deja de mostrarse y Ana conserva el aviso de moderación

### Requirement: API de notificaciones por pestaña

`GET /api/me/notifications` SHALL aceptar `tab=for_you|releases` (sin `tab`, `for_you`). `GET
/api/me/notifications/count` SHALL devolver además `newReleases` (booleano). `PUT /api/me/notifications/seen` SHALL
aceptar `tab=for_you|releases` y marcar vista solo esa pestaña. Un `tab` desconocido SHALL responder `400` con código
`VALIDATION_ERROR`.

#### Scenario: Listar novedades

- **WHEN** Ana pide `GET /api/me/notifications?tab=releases`
- **THEN** recibe solo entradas de lanzamientos, anunciados y sencillos

#### Scenario: Pestaña desconocida

- **WHEN** una petición pide `tab=otra`
- **THEN** la API responde `400` con código `VALIDATION_ERROR`

