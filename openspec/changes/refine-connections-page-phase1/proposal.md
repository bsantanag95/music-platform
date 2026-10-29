## Why

La auditoría de Seguidores y Seguidos (`/users/<u>/connections/{followers,following}`, 2026-10-28, 1280 y 375 px)
encontró fallas de base antes de cualquier rediseño:

- **Corte silencioso en 50:** las dos páginas piden 50 personas por orden alfabético e ignoran `hasNext`; el resto no
  aparece y no hay forma de llegar a él.
- **Acciones destructivas sin red:** "Eliminar seguidor" y "Dejar de seguir" actúan al primer clic, sin confirmación ni
  Deshacer.
- **Sin título ni contexto:** la pestaña del navegador dice "music-platform", no hay `h1` (solo un "@usuario" pequeño),
  ni nombre, ni avatar, ni migas; las pestañas no dicen cuántas personas hay.
- **Ruido por fila:** "Siguiendo · Dejar de seguir" repetido en cada fila; en los Seguidores propios hasta tres
  controles. A 375 px "Eliminar seguidor" cae a una tercera línea y los botones miden 36–38 px. Sin sesión, cada fila
  repite "Inicia sesión para seguir".
- **Vacíos y privado sin salida:** "No sigue a nadie todavía" sin enlace; el aviso de perfil privado no ofrece seguir.

## What Changes

- Cabecera con migas (perfil / Conexiones), avatar y nombre, `h1` con la pestaña y un subtítulo; metadata con el
  nombre de la pestaña y del perfil. Las pestañas Seguidos y Seguidores muestran su cifra.
- **Lista completa:** 50 personas al cargar y "Mostrar más" (con cuántas faltan) que pide las siguientes por cursor a
  un endpoint nuevo `GET /api/users/{username}/connections/{followers|following}`.
- **Fila compacta:** avatar, nombre y @usuario; a lo sumo una acción visible (Seguir, Aprobar/Rechazar) o un estado en
  texto ("Siguiendo", "Solicitud enviada", "Tú"). Lo que quita algo va a un menú ⋯ ("Acciones para «X»"): "Dejar de
  seguir", "Cancelar solicitud" y, en los Seguidores propios, "Eliminar seguidor…".
- **Confirmar y Deshacer:** "Eliminar seguidor" pide confirmación (decisión del usuario). Quitar un seguidor y dejar de
  seguir quitan la fila y ofrecen Deshacer; la operación se envía cuando el aviso expira (o al salir de la página), así
  que deshacer no vuelve a seguir: no repite la notificación, no convierte el seguimiento en solicitud en un perfil
  privado y conserva la fecha original.
- Vacíos con salida (los Seguidos propios, a buscar personas) y aviso de perfil privado con el botón para pedir seguir.

### Non-Goals

- Búsqueda, orden, insignias de relación, segmentos y aviso de solicitudes pendientes (Fase 2).
- Fecha del seguimiento, afinidad y riel lateral (Fase 3).
- La pestaña "Seguidos en común" conserva su contenido; solo hereda la cabecera nueva.

## Capabilities

### New Capabilities

- `profile-connections`: las vistas de conexiones de un perfil (Seguidos, Seguidores, Seguidos en común): acceso,
  cabecera, paginación y gestión propia desde la fila.

### Modified Capabilities

(ninguna)

## Impact

- `src/app/[locale]/users/[username]/connections/{followers,following,mutual}/page.tsx`
- `src/components/profiles/ProfileConnectionsHeader.tsx`, `ConnectionsUserList.tsx`, `ConnectionRow.tsx` (nuevo)
- `src/services/social/following.ts` (`listConnectionsPage`, `getConnectionsSummary`)
- `src/app/api/users/[username]/connections/[kind]/route.ts` (nuevo), `src/lib/api/schemas.ts`
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
