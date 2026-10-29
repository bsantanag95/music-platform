## Why

La auditoría de `/me/follow-requests` (2026-10-29, 1280 y 375 px) encontró fallas de base:

- **Rechazar no tiene vuelta:** un clic borra la solicitud, sin confirmación ni Deshacer.
- **Corte silencioso en 50 y orden por @usuario:** `listFollowRequests(id, 1, 50)` ignora `hasNext`; la solicitud más
  antigua puede quedar fuera y no hay forma de saber cuánto lleva esperando nadie.
- **Vacío engañoso con perfil público:** "No tienes solicitudes pendientes" no dice que con perfil público nadie pide
  (se sigue directo) ni enlaza a la privacidad.
- **Aprobar y desaparece:** la fila se va sin confirmar nada, justo cuando tendría sentido seguir de vuelta.
- **Sin estructura:** pestaña "music-platform", `h1` centrado y lista a la izquierda, sin migas, sin cifra, sin avatar
  ni fecha en las filas.

## What Changes

- Metadata, migas (perfil / Solicitudes), cabecera con cuántas hay pendientes; maquetación como Seguidores.
- **Orden por fecha** (más recientes primero) y "Mostrar más" por cursor: `GET /api/me/follow-requests?cursor=`.
- **Filas** con avatar, nombre, @usuario y "hace 2 días"; Aprobar y Rechazar visibles.
- **Rechazar con Deshacer diferido** (como quitar un seguidor): la fila sale y el rechazo se envía al vencer el aviso.
- **Aprobar deja la fila** con "Aprobada · ahora te sigue" y, si no la sigues, "Seguir de vuelta" (decisión del
  usuario); si ya la sigues o se lo pediste, lo dice.
- **Vacío según la privacidad:** con perfil público, explica por qué no llegan solicitudes y enlaza a la privacidad;
  con perfil privado, dice que aparecerán aquí y enlaza a tus Seguidores.

### Non-Goals

- Pestaña "Enviadas", "Aprobar todas" y menú ⋯ con Bloquear (Fase 2).
- Seguidores y discos en común en la fila (Fase 3).

## Capabilities

### New Capabilities

- `follow-requests-inbox`: la bandeja de solicitudes de seguimiento recibidas (orden, paginación, aprobar, rechazar y
  vacíos).

### Modified Capabilities

(ninguna)

## Impact

- `src/services/social/following.ts` (`listFollowRequestsPage`)
- `src/app/api/me/follow-requests/route.ts` (modo cursor), `src/lib/api/schemas.ts`
- `src/app/[locale]/me/follow-requests/page.tsx`, `src/components/social/FollowRequestList.tsx` (nuevo)
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
