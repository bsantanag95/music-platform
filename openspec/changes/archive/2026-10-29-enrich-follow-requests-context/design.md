## Context

`listFollowRequestsPage` devuelve la página de recibidas con `requestedAt` y `youFollow`. `mutualFollowersHint` cuenta,
para un par, cuántas personas que el visitante sigue siguen a otra cuenta, sin revelar identidades (spec
`profile-affinity`). `countSharedAlbums` (Fase 3 de conexiones) ya cuenta discos en común por lote, con visibilidad y
umbral.

## Decisions

### D1 — Seguidores en común por lote, solo la cifra

`countFollowedFollowersOf(viewerId, ids)`: para cada persona de `ids`, cuántas de las cuentas activas que el visitante
sigue (relación aceptada) la siguen a ella (aceptada). Una consulta con `GROUP BY`. Se muestra desde 1: "Lo sigue 1
persona que sigues" / "Lo siguen N personas que sigues". Nunca identidades, porque quien pide puede tener perfil
privado; es la misma regla que el aviso de perfil privado.

### D2 — Un único punto de enriquecimiento

`withFollowRequestContext(ownerId, page)` (en `src/services/social/follow-request-context.ts`) suma a cada fila
`followedByYourFollows` y `sharedAlbums` (o `null` bajo el umbral). Lo usan la página y el modo cursor del endpoint,
así "Mostrar más" trae las mismas señales. Va aparte de `following.ts` para no importar `affinity.ts` desde ahí.

### D3 — Línea de detalle

`@usuario · hace 2 horas · lo siguen 3 personas que sigues · 8 discos en común`, con los discos en ámbar como en
Seguidores; la línea se parte entre unidades y, si hace falta, dentro.

### D4 — Pestaña "Solicitudes" en las conexiones propias

`ProfileConnectionsHeader` recibe `requestsCount`; en tus Seguidos y Seguidores, con al menos una pendiente, suma una
pestaña "Solicitudes N" que enlaza a `/me/follow-requests`. Sin pendientes no aparece (con perfil público casi nunca
las hay). El aviso de Seguidores (Fase 2 de conexiones) se mantiene: es más visible justo donde se decide.

## Risks / Trade-offs

- `countFollowedFollowersOf` escanea los seguidos del visitante contra 50 personas; acotado por el índice único de
  `user_follow (follower_id, followed_id)`. Se mide contra Postgres antes de cerrar.
