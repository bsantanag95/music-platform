## Why

Tras la Fase 1 (`refine-connections-page-phase1`), Seguidores y Seguidos muestran a todas las personas, pero siguen
sin herramientas para gestionar una red (auditoría del 2026-10-28):

- **Sin búsqueda ni orden:** solo alfabético por `username`; encontrar a alguien en 200 seguidores es recorrer la
  lista. `user_follow.created_at` ya está, pero no hay "Recientes".
- **No dice quién te sigue de vuelta:** en tus Seguidos no se ve quién te sigue; en tus Seguidores, seguir de vuelta es
  un "Seguir" genérico. No hay forma de ver solo los mutuos o a quién no sigues de vuelta.
- **Solicitudes escondidas:** con una cuenta privada, las solicitudes pendientes viven en `/me/follow-requests` y
  Seguidores no las menciona.

## What Changes

- **Búsqueda** por nombre o @usuario (sin distinguir acentos ni mayúsculas) y **orden** Recientes / Nombre, en el
  servidor (la lista es paginada) y reflejados en la URL. Orden por defecto (decisión del usuario): Recientes, salvo en
  los Seguidos de un perfil ajeno, que van por Nombre.
- **Insignias** de la relación con el visitante: "Mutuo", "Te sigue", "Lo sigues", "Tú", sin repetir lo que la vista
  ya dice (en tus Seguidores nadie lleva "Te sigue").
- **"Seguir de vuelta"** como acción principal cuando la persona te sigue y tú no a ella.
- **Segmentos** en las vistas propias: Todos · Mutuos · No sigues de vuelta (Seguidores) o No te siguen (Seguidos),
  con su cifra.
- **Aviso de solicitudes pendientes** en tus Seguidores, con enlace a revisarlas.
- El endpoint de "Mostrar más" acepta `q`, `sort` y `segment`, pagina con un cursor opaco y devuelve el total del corte.

### Non-Goals

- Fecha del seguimiento, afinidad y riel lateral (Fase 3).
- Segmentos en perfiles ajenos.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `profile-connections`: búsqueda, orden, insignias, seguir de vuelta, segmentos propios y aviso de solicitudes.

## Impact

- `src/services/social/following.ts` (`listConnectionsPage` con filtros y cursor, `countConnectionSegments`,
  `followersOf`), `src/services/social/connection-filters.ts` (nuevo, sin dependencias de servidor)
- `src/app/api/users/[username]/connections/[kind]/route.ts`, `src/lib/api/schemas.ts`
- `src/components/profiles/{ProfileConnectionsView,ConnectionsUserList,ConnectionRow}.tsx`,
  `ConnectionsToolbar.tsx` (nuevo)
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
