## 1. Cliente y mensajes

- [x] 1.1 `lib/api/favorites.ts`: `addFavorite(target, audience)` (POST con `audience`); prueba.
- [x] 1.2 `favorites.json` es/en: claves del menú, deshacer, quitar en lote y selección.

## 2. Menú de acciones e insignia

- [x] 2.1 `FavoriteActions.tsx`: insignia + `⋯` + menú (`menu`, `menuitemradio`, `menuitem`), Escape, clic fuera, foco de vuelta, 44 px táctil; pruebas.
- [x] 2.2 `UndoToast`: aviso con "Deshacer", `role="status"`, expira a los 6 s; pruebas.

## 3. Vistas

- [x] 3.1 `FavoriteTile` y `FavoritesDetailed`: insignia y menú en lugar de selector y "Quitar"; resaltado al seleccionar.
- [x] 3.2 `FavoritesGraphic`: portada limpia, marca de audiencia no pública, título, artista y `⋯`.
- [x] 3.3 `FavoritesIndex`: tabla con encabezados, fecha, audiencia y acciones; sin audiencia ni acciones en modo lectura.

## 4. Muro: deshacer, selección y lote

- [x] 4.1 `FavoritesWall`: quitar con deshacer (re-crear con audiencia), aviso, y anuncio de quitado.
- [x] 4.2 Modo selección: "Seleccionar todo" por sección, casillas de 24 px, resaltado, "Quitar" en lote con confirmación y restauración ante fallos.

## 5. Pruebas, documentación y verificación

- [x] 5.1 Actualizar y ampliar pruebas de `FavoriteTile`, renderers y `FavoritesWall` (menú, deshacer, lote, selección, modo lectura).
- [x] 5.2 `docs/05-features/lists-and-favorites.md`.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador (escritorio, 375 px y perfil público).
