## Context

La página es un Server Component que pide `listFollowRequests(id, 1, 50)` (orden por `username`) y pinta `UserList`
variante `requests`, que delega cada fila en `FollowButton` con relación `incoming` (Aprobar / Rechazar inmediatos; al
terminar, la fila se quita). `GET /api/me/follow-requests` no tiene otros clientes.

## Decisions

### D1 — Orden por fecha y cursor

`listFollowRequestsPage(userId, { cursor, limit })`: solicitudes `pending` dirigidas al usuario, de cuentas activas,
por `user_follow.created_at DESC, id DESC`, con cursor opaco `[created_at::text, id]` en base64url (mismo esquema que
las conexiones) y `total` de `countPendingFollowRequests`. Cada fila trae `requestedAt` y `youFollow` (`accepted`,
`pending` o `null`: si el dueño ya sigue a esa persona o se lo pidió), para el estado tras aprobar.

`GET /api/me/follow-requests` gana un modo cursor: con el parámetro `cursor` (vacío = primera página) responde
`{ users, hasNext, nextCursor, total }`; sin él conserva la forma paginada de siempre.

### D2 — Rechazar con Deshacer diferido

Igual que quitar un seguidor (`refine-connections-page-phase1`, D4): la fila sale, un `UndoToast` ofrece Deshacer 6 s y
`POST …/reject` se envía al vencer, con la siguiente acción igual o al salir de la vista (`pagehide` con `keepalive`).
Deshacer devuelve la fila sin tocar el servidor. Rechazar no avisa a nadie, así que no hace falta confirmar.

### D3 — Aprobar deja la fila

Aprobar es inmediato (no se puede revertir sin quitar al seguidor, que ya tiene su camino). La fila se queda con
"Aprobada · ahora te sigue" y:

- `youFollow = null` → "Seguir de vuelta" (`FollowButton`, "Solicitar seguir" si su perfil es privado);
- `youFollow = accepted` → "Ya la sigues";
- `youFollow = pending` → "Tu solicitud está enviada".

La cifra de la cabecera baja al aprobar o rechazar. Si la solicitud ya no existe (`REQUEST_NOT_FOUND`: la otra persona
la canceló), la fila sale con un aviso.

### D4 — Vacíos según la privacidad

Sin solicitudes: con perfil público, "Tu perfil es público" + por qué no llegan + "Cambiar la privacidad"
(`/me/settings/privacy`); con perfil privado, "No tienes solicitudes pendientes" + "Cuando alguien pida seguirte,
aparecerá aquí" + enlace a tus Seguidores. Solicitudes que quedaron pendientes al pasar a público siguen listándose.

### D5 — Componente propio

`FollowRequestList` reemplaza a `UserList` variante `requests` (que queda solo para bloqueos). La fila reutiliza
`UserAvatar` y la forma de `ConnectionRow` (fila, no tarjeta), con la acción bajando a otra línea en un teléfono.

## Risks / Trade-offs

- El estado "aprobada" vive solo hasta salir de la página; al volver, esa persona ya está en Seguidores.
