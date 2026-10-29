## Why

Tras la Fase 1 (`refine-follow-requests-phase1`), la bandeja ordena, pagina y responde bien, pero solo cubre la mitad
de las solicitudes y una a una (auditoría del 2026-10-29):

- **No hay "Enviadas":** la spec `user-following` habla de consultar solicitudes recibidas o enviadas, pero las que
  envió el usuario solo se ven entrando perfil por perfil; no hay dónde revisarlas ni cancelarlas juntas.
- **Sin acciones en lote:** con muchas solicitudes hay que aprobarlas de a una.
- **Bloquear exige salir:** para bloquear a quien pide seguirte hay que ir a su perfil.

## What Changes

- **Pestañas Recibidas · Enviadas** en `/me/follow-requests` (`?tab=sent`), cada una con su cifra.
- **Enviadas:** a quién pidió seguir el usuario, de la más reciente a la más antigua, con "Mostrar más" por cursor
  (`GET /api/me/follow-requests/sent?cursor=`) y "Cancelar solicitud" con Deshacer diferido (cancelar y volver a pedir
  notificaría de nuevo a la otra persona).
- **"Aprobar todas"** en Recibidas desde 3 solicitudes, con confirmación (decisión del usuario; sin "Rechazar todas"):
  `POST /api/me/follow-requests/approve-all` aprueba todas las pendientes, también las no cargadas, en una transacción.
- **Menú ⋯** en cada solicitud recibida: "Ver perfil" y "Bloquear…" (con confirmación; quita la solicitud).

### Non-Goals

- Seguidores y discos en común en la fila, y el acceso desde la cabecera de Seguidores (Fase 3).
- "Rechazar todas".

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `follow-requests-inbox`: pestaña de enviadas, aprobar todas y bloquear desde la bandeja.

## Impact

- `src/services/social/following.ts` (`listSentRequestsPage`, `countSentRequests`, `approveAllRequests`)
- `src/app/api/me/follow-requests/sent/route.ts`, `src/app/api/me/follow-requests/approve-all/route.ts` (nuevos),
  `src/lib/api/schemas.ts`
- `src/app/[locale]/me/follow-requests/page.tsx`, `src/components/social/FollowRequestList.tsx`,
  `SentRequestList.tsx` (nuevo)
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
