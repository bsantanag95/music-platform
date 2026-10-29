## Why

Tras las Fases 1 y 2, la bandeja `/me/follow-requests` responde, pagina, aprueba en lote y separa recibidas de
enviadas, pero cada solicitud sigue siendo solo un nombre y una fecha: no hay nada que ayude a decidir si aprobar a
alguien (auditoría del 2026-10-29). Y la bandeja solo se encuentra desde el menú de usuario o el aviso de Seguidores.

## What Changes

- **Contexto en cada solicitud recibida**, en la línea de detalle:
  - "Lo siguen N personas que sigues": la misma señal que el aviso de perfil privado (`mutualFollowersHint`), solo la
    cifra, sin identidades.
  - "N discos en común": el mismo cálculo y el mismo umbral de 3 que Seguidores (`countSharedAlbums`).
  - Una lectura por lote para la página (una consulta por señal), no por fila.
- **Pestaña "Solicitudes"** en la cabecera de tus Seguidos y Seguidores cuando tienes pendientes, con la cifra,
  enlazada a la bandeja.

### Non-Goals

- Contexto en las enviadas (la decisión ya la tomaste al pedir).
- Mostrar quiénes son los seguidores en común (el perfil de quien pide puede ser privado).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `follow-requests-inbox`: contexto de cada solicitud.
- `profile-connections`: acceso a la bandeja desde la cabecera propia.

## Impact

- `src/services/profiles/affinity.ts` (`countFollowedFollowersOf`), `src/services/social/follow-request-context.ts`
  (nuevo)
- `src/app/api/me/follow-requests/route.ts`, `src/lib/api/schemas.ts`
- `src/app/[locale]/me/follow-requests/page.tsx`, `src/components/social/FollowRequestList.tsx`
- `src/components/profiles/{ProfileConnectionsHeader,ProfileConnectionsView}.tsx`
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
