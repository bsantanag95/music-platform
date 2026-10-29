## Why

Con las Fases 1 y 2, Seguidores y Seguidos ya muestran a todas las personas y se pueden buscar, ordenar y filtrar, pero
cada fila sigue siendo solo un nombre: no dice desde cuándo existe la relación ni si esa persona comparte algo con quien
mira, que es lo que ayuda a decidir a quién seguir de vuelta. Y en pantallas anchas la columna derecha queda vacía.

## What Changes

- **Desde cuándo:** cada fila dice desde cuándo existe la relación listada ("Te sigue desde oct 2026", "La sigues desde
  sep 2026"; en un perfil ajeno, "Desde ago 2026"), con la fecha de `user_follow.created_at`.
- **Discos en común:** "N discos en común" con quien mira: álbumes que ambos tienen en favoritos o valoraron con 4
  estrellas o más, respetando lo que la otra persona deja ver. Solo a partir de 3 (decisión del usuario: con umbral, y
  solo respecto al visitante). Una lectura por lote para la página, no por fila.
- **Panel lateral** desde `lg`: en tus Seguidores, "Para seguir de vuelta" (hasta 5, con su botón, y enlace al
  segmento); en un perfil ajeno, "En común con <nombre>" con los seguidores en común y enlace a la pestaña. Sin
  contenido, no hay panel y la página conserva su ancho.

### Non-Goals

- Afinidad más allá de los discos (artistas, canciones) en la fila: vive en el bloque de afinidad del perfil.
- Ordenar por afinidad.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `profile-connections`: fecha del seguimiento y discos en común en la fila; panel lateral.

## Impact

- `src/services/social/following.ts` (`followedAt` en `listConnectionsPage`), `src/services/profiles/affinity.ts`
  (`countSharedAlbums`)
- `src/app/api/users/[username]/connections/[kind]/route.ts`, `src/lib/api/schemas.ts`
- `src/components/profiles/{ConnectionRow,ConnectionsUserList,ProfileConnectionsView}.tsx`,
  `ConnectionsRail.tsx` (nuevo)
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
