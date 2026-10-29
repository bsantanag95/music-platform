## Context

La Fase 1 dejó una lista paginada por cursor (`username > after`) con 50 personas por página, una fila compacta y
Deshacer diferido. Como la lista no se carga entera, buscar, ordenar y segmentar tienen que ir al servidor.

## Decisions

### D1 — Filtros en el servidor, cursor opaco

`listConnectionsPage(userId, kind, { q, sort, segment, cursor })`:

- `q`: `search_normalize(username)` o `search_normalize(display_name)` contienen `search_normalize(q)` (con
  `escapeLike`), igual que la búsqueda de artistas de un género.
- `sort = "recent"`: `user_follow.created_at DESC, user_follow.id DESC`. `sort = "name"`:
  `lower(coalesce(display_name, username)) ASC, username ASC` (el nombre que se ve, no el @).
- El cursor es la clave de orden de la última fila, en JSON base64url (`[valor, desempate]`); un cursor ilegible o de
  otro orden es `VALIDATION_ERROR`. Sigue sin correr filas al quitar una.
- Devuelve también `total`: cuántas personas hay en el corte (búsqueda + segmento), para "Mostrar N más".

Alternativa descartada: filtrar en el cliente, como `/me/artists` — aquí la lista puede tener miles de filas.

### D2 — Orden por defecto

Recientes en Seguidores (quién llegó) y en tus Seguidos; Nombre en los Seguidos de un perfil ajeno, donde la fecha en
que esa persona siguió a otra no te dice nada. Solo el valor distinto del defecto va a la URL.

### D3 — Insignias y "Seguir de vuelta"

La fila ya conoce la relación del visitante hacia la persona (`relationsFor`); el servidor suma si la persona sigue al
visitante (`followersOf(viewerId, ids)`, relación aceptada) como `followsYou`. Con ambas:

| Visitante → persona | Persona → visitante | Insignia | Acción visible |
|---|---|---|---|
| `following` | sí | Mutuo | — |
| `following` | no | Lo sigues | — |
| `none` | sí | Te sigue | **Seguir de vuelta** |
| `none` | no | — | Seguir |
| `self` | — | Tú | — |

Lo que la vista ya dice no se repite: en tus Seguidores nadie lleva "Te sigue" y en tus Seguidos nadie lleva "Lo
sigues". La insignia reemplaza al texto "Siguiendo" de la Fase 1. "Solicitud enviada", "Bloqueado" y Aprobar/Rechazar
quedan igual. Mientras un "Dejar de seguir" espera su Deshacer, "Seguir" (o "Seguir de vuelta") sigue deshaciendo.

### D4 — Segmentos propios

Solo cuando el visitante es el dueño: Todos · Mutuos · No sigues de vuelta (en Seguidores: el dueño no sigue a la
persona con relación aceptada) o No te siguen (en Seguidos: la persona no sigue al dueño). Cifras de
`countConnectionSegments` al cargar la página, sin la búsqueda; no se recalculan tras quitar a alguien (la lista sí
cambia). Un segmento vacío se deshabilita salvo que esté activo, como en `/me/artists`. El endpoint ignora `segment` si
el visitante no es el dueño.

### D5 — Aviso de solicitudes

En tus Seguidores, con al menos una solicitud pendiente (`countPendingFollowRequests`): "Tienes N solicitudes de
seguimiento pendientes. Revisar →" hacia `/me/follow-requests`.

### D6 — Cambio de filtros en el cliente

`ConnectionsUserList` guarda `q`, `sort` y `segment` (con `useProgressFilters`, que escribe la URL con `replaceState`).
Al cambiar un filtro pide la primera página al endpoint (la búsqueda con 250 ms de espera) y reemplaza la lista;
respuestas viejas se descartan. Un Deshacer pendiente se envía antes de recargar.

## Risks / Trade-offs

- La búsqueda usa `search_normalize` sin índice sobre la unión con `user_follow`: el corte ya está acotado por
  `followed_id` / `follower_id` (índice único de la relación), así que el costo es lineal en la red de una persona.
- Las cifras de los segmentos no se actualizan en vivo; recargar las corrige.
