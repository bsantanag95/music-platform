## Why

Tras las fases 1 y 2, las tres vistas de `/me/favorites` siguen cargando cada ficha con un selector de audiencia y
un "Quitar favorito" subrayado: 20 selectores en la primera página, controles que pesan más que la portada en
Gráfico (casi 100 de 236 px), una acción destructiva de 16 px sin confirmación ni deshacer y un modo selección con
casillas de 16 px y sin forma de elegir una sección entera. La audiencia es información de privacidad importante,
pero un `select` por tarjeta la convierte en ruido. Esta fase rehace las vistas igual que `/me/ratings`.

## What Changes

- **Insignia de audiencia y menú `⋯`:** cada favorito propio muestra su audiencia como una insignia con icono
  (candado, personas, globo) y un botón `⋯`; ambos abren el mismo menú con las tres audiencias y "Quitar de
  favoritos". Reemplazan al selector y al enlace subrayado en las tres vistas. En modo lectura (perfil público) no
  hay insignia ni menú.
- **Quitar con "Deshacer":** quitar ya no es definitivo al instante: aparece un aviso "Quitado de favoritos ·
  Deshacer" que vuelve a marcar el favorito con su audiencia anterior (conserva el aviso accesible de quitado).
- **Gráfico limpio:** la portada queda sola, con título y artista debajo y el menú `⋯`; una marca con icono sobre la
  portada indica solo cuando el favorito no es público.
- **Índice como tabla:** una `<table>` con encabezados (Título, Fecha, Audiencia y acciones) con las columnas
  alineadas.
- **Detallada más ordenada:** la ficha sustituye selector y enlace por la insignia y el menú.
- **Modo selección:** casillas de 24 px siempre, ficha seleccionada resaltada, "Seleccionar todo" por sección,
  barra de acciones de 44 px y **Quitar en lote** con confirmación en la propia barra.

### Goals

- Mostrar la audiencia sin ruido y sin perder la capacidad de cambiarla o de quitar.
- Que quitar sea reversible y que el modo selección sea cómodo con una mano.

### Non-Goals

- API o datos nuevos (el deshacer reutiliza `POST` con `audience`; el lote de quitar usa `DELETE` por favorito).
- Foto del artista en la placa (queda para después).
- Cambios en el perfil público más allá de que el muro compartido conserva su modo lectura.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `favorites`: nuevos requisitos de menú de acciones con insignia de audiencia, quitar con deshacer, Gráfico limpio,
  Índice como tabla y modo selección; los requisitos de controles legibles y áreas táctiles hablan del menú y la
  insignia en lugar del selector y "Quitar favorito".

## Impact

- `src/components/favorites/`: nuevos `FavoriteActions.tsx` (insignia y menú) y `UndoToast`; `FavoriteTile`,
  `FavoritesDetailed`, `FavoritesGraphic`, `FavoritesIndex` (tabla), `FavoritesWall` (deshacer, lote, selección),
  `favorites-items-view.ts`; `src/lib/api/favorites.ts` (`addFavorite` con audiencia).
- `messages/{es,en}/favorites.json`, `docs/05-features/lists-and-favorites.md` y pruebas. Sin cambios de esquema.
