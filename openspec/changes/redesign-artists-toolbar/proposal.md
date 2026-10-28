## Why

La Fase 1 (`refine-artists-page-phase1`) arregló la base de `/me/artists`. La auditoría dejó pendiente la barra:

- **No hay forma de seguir a un artista desde aquí:** hay que salir a buscarlo y seguirlo desde su página.
- **No se puede acotar la lista:** solo hay buscador y orden; no se distingue quién sacó algo ni grupos de solistas.
- **No se puede ordenar por actividad:** "Recientes" es la fecha en que lo seguiste, no cuándo publicó.

## What Changes

- **"+ Seguir artista"** en la cabecera: abre el diálogo de "+ Añadir" en una acción nueva, **Seguir artista**, que
  busca solo artistas y los sigue; al cerrar, la lista se actualiza.
- **Segmentos con cuenta:** Todos · Con novedades · Grupos · Solistas (decisión del usuario). En la URL (`segment`).
- **Novedad = solo el calendario de lanzamientos** (decisión del usuario): un disco del artista en
  `release_calendar_entry`, no excluido, de los últimos 30 días o anunciado.
- **Orden "Último lanzamiento":** la novedad del calendario o, si no hay, el disco más reciente de su discografía
  guardada; sin dato, al final.
- El servicio devuelve por artista la novedad, el último disco y la fecha en que lo sigues (la Fase 3 los muestra).

### Non-Goals

- Mostrar la novedad, el último disco o la fecha en las filas, y el riel de próximos lanzamientos (Fase 3).
- Avisos por artista.

## Capabilities

### Modified Capabilities

- `artist-following`: la superficie de gestión gana seguir desde la página, segmentos y el orden por último lanzamiento.
- `header-quick-actions`: acción "Seguir artista".

## Impact

- `src/services/social/artist-following.ts` (`listAllFollowedArtists` con `news`, `latestRelease`, `followedAt`),
  `src/lib/api/schemas.ts`.
- `src/components/catalog/FollowedArtist*`, `followed-artist-filters.ts`, `src/app/[locale]/me/artists/page.tsx`.
- `src/components/quick-actions/` (`types.ts`, `QuickActionsDialog.tsx`, `ActionIcons.tsx`, `panels/FollowPanel.tsx`).
- `messages/{es,en}/{users,quickActions}.json`, `docs/05-features/user-profile.md`. Sin cambios de esquema ni de API.
