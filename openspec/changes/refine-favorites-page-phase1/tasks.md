## 1. Modo de vista sin parpadeo

- [x] 1.1 `use-favorite-view-mode.ts`: devolver `ready` como tercer elemento (verdadero tras leer `localStorage`, también si lanza); pruebas del hook.
- [x] 1.2 `FavoritesWall`: marcador de listado mientras `!ready` y conmutador `invisible` hasta entonces.

## 2. Contadores, conmutador y barra legible

- [x] 2.1 `FavoritesToolbar`: exportar `favoriteScopeNarrowed` (búsqueda, tipo, audiencia); anchos `20ch`/`19ch`/`15ch` y nombre visible con `label` (Tipo, Audiencia, Ordenar).
- [x] 2.2 `favorites.json` es/en: claves `resultsLabel`, `removedAnnouncement`, `typeShort`, `audienceShort`.
- [x] 2.3 `FavoritesWall`: cabecera honesta (resultados con total por tipo; sin cabecera con la biblioteca vacía), conmutador visible con filtros sin resultados, "Seleccionar" solo con favoritos y fuera del modo lectura.

## 3. Ancho único, tipo y controles

- [x] 3.1 `me/favorites/page.tsx`: `main` como columna `mx-auto w-full max-w-4xl` con título a la izquierda; `FavoritesWall` deja de fijar `max-w-3xl`.
- [x] 3.2 `FavoriteTile`: prop `showType` (por defecto `true`); `FavoritesDetailed` la pasa en `false`; `FavoritesIndex` quita la columna de tipo.
- [x] 3.3 `FavoritesGraphic` e `FavoritesIndex`: texto de los controles de al menos 11 px y sin atenuar el contenedor de acciones del Índice.

## 4. Áreas táctiles, avisos y prioridad

- [x] 4.1 `min-h-11` con puntero grueso en: conmutador de vista, selector de audiencia, "Quitar favorito", "Seleccionar", barra de selección y "Listo"; casillas `size-6` con puntero grueso.
- [x] 4.2 `FavoritesWall`: `setAnnounce(removedAnnouncement)` al quitar, `errorId` por ficha en `FavoritesRowActions` y aviso `saveError` con `role="alert"` bajo la ficha en los tres renderers (el fallo en lote sigue global).
- [x] 4.3 `priorityIds` (primeros seis favoritos) desde `FavoritesWall` hacia los renderers y `CoverThumb`.

## 5. Pruebas, documentación y verificación

- [x] 5.1 Pruebas: `FavoritesWall.test.tsx` (marcador, cabecera, conmutador con filtros, anuncio, error por ficha, ancho, modo lectura intacto), `FavoriteTile.test.tsx` (`showType`), pruebas de los renderers y la barra.
- [x] 5.2 `docs/05-features/` de favoritos: actualizar lo que describa estos comportamientos.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador (escritorio y 375 px) desde el worktree, en las tres vistas, y revisar el perfil público (modo lectura).
