## Context

Las dos páginas son casi idénticas: resuelven el perfil, piden `listFollowers`/`listFollowing(id, 1, 50)` y pintan
`ConnectionsUserList`, que usa `UserCard` (la tarjeta de la búsqueda de usuarios) con un `FollowButton` completo por
fila. Para el dueño también son su página de gestión (desde que se eliminaron `/me/followers` y `/me/following`).

## Decisions

### D1 — Cabecera y cifras

`ProfileConnectionsHeader` pinta migas (`@usuario` → perfil, "Conexiones"), avatar y nombre del perfil, `h1` con la
pestaña activa y un subtítulo que cambia si es el propio perfil ("Las personas que te siguen" / "Las personas que
siguen a Ana"). Las pestañas Seguidos y Seguidores llevan la cifra de `countFollows` (la misma de la Placa: solo
cuentas activas, relación aceptada), solo con acceso al perfil. Avatar y cifras salen de
`getConnectionsSummary(userId)`, una lectura aparte para no ensanchar `PublicProfile`.

Metadata: `"<Pestaña> · <nombre>"`.

### D2 — Paginación por cursor

`listConnectionsPage(userId, kind, { after, limit })` ordena por `username` (único) y pagina con `username > after`,
así que quitar una fila no corre la página siguiente. La página trae 50; el endpoint
`GET /api/users/{username}/connections/{followers|following}?after=` trae las siguientes 50 con la relación del
visitante hacia cada una (`relationsFor`). Sin acceso al perfil devuelve una lista vacía (mismo criterio que
`mutual-followers`); un `kind` desconocido es `VALIDATION_ERROR`. "Mostrar más" dice cuántas faltan (cifra de la
pestaña menos las cargadas) y descarta repetidas por `id`.

Alternativa descartada: página por desplazamiento (`page`): tras quitar filas, la página 2 se salta personas.

### D3 — Fila compacta

`ConnectionRow` reemplaza a `UserCard` en estas vistas: una fila (no tarjeta) con avatar, nombre y @usuario, y una
zona de acción que no baja a otra línea en 375 px:

| Relación del visitante | Visible | Menú ⋯ |
|---|---|---|
| `none` | Seguir / Solicitar seguir | — |
| `incoming` | Aprobar · Rechazar (`FollowButton`) | — |
| `following` | "Siguiendo" (texto) | Dejar de seguir |
| `requested` | "Solicitud enviada" (texto) | Cancelar solicitud |
| `self` | "Tú" (texto) | — |
| `blocked` | "Bloqueado" (texto) | — |
| sin sesión | nada | — |

En los Seguidores propios el menú suma "Eliminar seguidor…" (en rojo). El menú usa `RowMenu` con "Acciones para «X»",
32 px y 44 px con puntero grueso, como en `/me/artists`.

### D4 — Confirmar y Deshacer diferido

"Eliminar seguidor…" abre `ConfirmDialog`. Al confirmar (y al elegir "Dejar de seguir"), la fila sale de la lista y un
`UndoToast` ofrece Deshacer durante 6 s; la petición (`DELETE /api/me/followers/{id}` o
`DELETE /api/users/{u}/follow`) se envía cuando el aviso expira, cuando llega otra acción diferida o al salir de la
vista (desmontaje y `pagehide`, con `keepalive`). Deshacer solo devuelve la fila a su lugar: no hay nada que revertir
en el servidor.

Por qué no "volver a seguir" (como `/me/artists`): seguir de nuevo emite otra notificación `new_follower`, en un perfil
privado crea una solicitud en vez de la relación aceptada y pierde `created_at` (que la Fase 3 muestra como "desde").
Quitar a un seguidor ni siquiera se podría revertir así: la relación es del otro.

Si la petición falla, la fila vuelve y el aviso informa el error. "Cancelar solicitud" es inmediato (sin Deshacer):
volver a pedir no pierde nada.

### D5 — Vacíos y perfil privado

Vacíos con `EmptyState compact`: en los Seguidos propios, enlace a buscar personas (`/users`); en el resto, solo
texto. Sin acceso a un perfil privado: "Este perfil es privado. Síguelo para ver sus conexiones." con el
`FollowButton` (Solicitar seguir) si hay sesión y no hay bloqueo.

## Risks / Trade-offs

- Con Deshacer diferido, cerrar la pestaña depende de `pagehide` + `keepalive`; si el navegador la descarta antes, la
  relación queda como estaba (falla segura: no se borra nada sin enviar).
- Orden alfabético por `username`, no por nombre visible, hasta que la Fase 2 agregue el orden.
