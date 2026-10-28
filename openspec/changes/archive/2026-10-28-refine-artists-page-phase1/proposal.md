## Why

La auditoría de `/me/artists` (2026-10-28) encontró fallas de base antes de cualquier rediseño:

- **Se cortan en 50:** la página pide 50 artistas y no pagina; el resto no aparece ni en la búsqueda, que filtra en
  memoria.
- **Una pared de botones "Siguiendo":** cada fila lleva un botón primario ámbar que repite un estado. Dejar de seguir es
  un clic sin confirmación ni Deshacer, y la fila no se va.
- **Menú ⋯ con textos equivocados:** "Agregar elemento" (la etiqueta de la página de una lista) y siempre "Marcar como
  favorito", aunque ya lo sea; su nombre es "Más acciones", sin el artista, y mide 24 px.
- **Base:** el modo de vista parpadea al cargar, búsqueda y orden no van en la URL, la pestaña se llama
  "music-platform", el título va centrado sin migas ni cuenta, el vacío lleva a la búsqueda general y el orden se
  corta en móvil ("Recien…"). En Gráfico, cada foto lleva un botón debajo.

## What Changes

- La página carga **todos** los artistas seguidos, con el estado de favorito de cada uno.
- **"Dejar de seguir" pasa al menú ⋯** (decisión del usuario): la fila desaparece y un aviso ofrece **Deshacer**, que
  vuelve a seguir y la repone en su lugar. Sin botón en la fila.
- Menú ⋯ con el nombre del artista ("Acciones para «X»"), 32 px (44 con puntero grueso): "Añadir a una lista",
  "Marcar como favorito" / "Quitar de favoritos" según el estado, y "Dejar de seguir".
- Modo de vista sin parpadeo (marcador hasta leer la preferencia); `q` y `sort` en la URL con `replaceState`.
- Cabecera a la izquierda con migas, título, cuántos sigues y `max-w-4xl`; metadata de la página. Vacío con enlace a
  buscar artistas (`/search?type=artist`). Orden que no se corta en móvil.
- Gráfico: foto, nombre y el menú ⋯ sobre la foto; sin botón debajo.

### Non-Goals

- Seguir artistas desde la página, segmentos y orden por lanzamiento (Fase 2).
- Contenido nuevo en las filas, novedades y riel (Fase 3).

## Capabilities

### Modified Capabilities

- `artist-following`: la superficie de gestión lista a todos los artistas, deja de seguir desde el menú con Deshacer y
  conserva búsqueda y orden en la URL.

## Impact

- `src/services/social/artist-following.ts` (`listAllFollowedArtists`), `src/lib/api/schemas.ts`
  (`FollowedArtistSchema.favorite`).
- `src/app/[locale]/me/artists/page.tsx`, `src/components/catalog/FollowedArtist*`.
- `messages/{es,en}/users.json`, `docs/05-features/` (artistas seguidos).
- Sin cambios de esquema ni de API.
