## Context

La Fase 1 dejó `FollowRequestList` (recibidas) con cursor por fecha, Rechazar con Deshacer diferido y Aprobar que deja
la fila. Las solicitudes enviadas son filas `user_follow` con `follower_id` = el usuario y `status = 'pending'`;
`DELETE /api/users/{username}/follow` ya las borra.

## Decisions

### D1 — Pestañas por parámetro

`?tab=sent` elige Enviadas; cualquier otro valor, Recibidas. La página resuelve las dos cifras
(`countPendingFollowRequests`, `countSentRequests`) y solo la lista de la pestaña activa. Las pestañas siguen la forma
de las de conexiones (enlaces con `aria-current`, cifra al lado, 44 px).

### D2 — Enviadas

`listSentRequestsPage(userId, { cursor })`: pendientes con `follower_id` = el usuario, hacia cuentas activas, por
`created_at DESC, id DESC`, mismo cursor opaco (etiqueta `sent`). `GET /api/me/follow-requests/sent?cursor=` (vacío =
primera página). La fila dice "Pediste seguirla hace X" y ofrece "Cancelar solicitud": la fila sale y un aviso ofrece
Deshacer; el `DELETE /api/users/{u}/follow` se envía al vencer, con otra cancelación o al salir (`keepalive`).
Deshacer no vuelve a pedir: no repite la notificación `follow_request`.

### D3 — Aprobar todas

Botón en Recibidas desde 3 pendientes (`total`), con `ConfirmDialog` ("¿Aprobar las N solicitudes?"). Antes de
confirmar se envía el rechazo pendiente, si lo hay. `approveAllRequests(ownerId)` en una transacción: toma las
pendientes dirigidas al dueño de cuentas activas y sin bloqueo en ningún sentido, las pasa a `accepted`, retira sus
avisos `follow_request` y emite un `follow_accepted` por cada una (lo mismo que `approveRequest`, en lote). Devuelve
cuántas aprobó. La lista marca como aprobadas las filas cargadas; las no cargadas ya no aparecerán.

### D4 — Bloquear desde la bandeja

Menú ⋯ ("Acciones para «X»") en cada solicitud recibida pendiente: "Ver perfil" y "Bloquear…". Bloquear pide
confirmación, llama a `PUT /api/users/{u}/block` (que ya borra la relación en ambos sentidos, la solicitud incluida) y
quita la fila con un aviso informativo. Sin Deshacer: desbloquear vive en `/me/blocks` y no restaura la solicitud.

## Risks / Trade-offs

- "Aprobar todas" puede emitir cientos de avisos en una transacción; las solicitudes de una cuenta personal rara vez
  pasan de decenas, y `emitNotifications` ya inserta en lote.
