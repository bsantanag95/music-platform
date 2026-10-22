## 1. Modo de vista sin parpadeo y ancho

- [x] 1.1 `use-want-to-listen-view-mode.ts`: devolver `ready` como tercer elemento (verdadero tras leer `localStorage`, también si lanza); pruebas del hook.
- [x] 1.2 `WantToListenList`: marcador de listado mientras `!ready` y conmutador `invisible` hasta entonces.
- [x] 1.3 `me/want-to-listen/page.tsx`: `main` como columna `mx-auto w-full max-w-4xl` con título a la izquierda; `WantToListenList` deja de fijar `max-w-3xl`.

## 2. Vistas sin solapamientos

- [x] 2.1 `EntriesDetailed`: acciones bajo el texto bajo `sm`, en fila desde `sm`, con `flex-wrap`.
- [x] 2.2 `EntriesGraphic`: `li` con `min-w-0`, acciones apiladas; `RemoveEntryButton` y la acción de discografía con `max-w-full text-left`.
- [x] 2.3 `EntriesIndex`: sin `sm:opacity-40`; artista en segunda línea bajo `sm`.

## 3. Acción de discografía, conteos y estado vacío

- [x] 3.1 `WantToListenArtistJourneyAction`: marcador `invisible` mientras `loading`; textos "Completar discografía" / "Complete discography" en `wantToListen.json`.
- [x] 3.2 `WantToListenSection`: conteo solo con `complete` (`!hasNext`).
- [x] 3.3 Estado vacío con enlace a `/search` (`emptyCta`).

## 4. Áreas táctiles, avisos y prioridad

- [x] 4.1 `min-h-11` con puntero grueso en "Quitar", la acción de discografía y el conmutador.
- [x] 4.2 Región `status` con `removedAnnouncement` al quitar; `errorId` en `WantToListenRowActions` y `removeError` con `role="alert"` bajo la entrada en los tres renderers; `loadError` solo para "Cargar más".
- [x] 4.3 `priorityIds` (primeras seis entradas) hacia los renderers y `CoverThumb`.

## 5. Pruebas, documentación y verificación

- [x] 5.1 Pruebas: `WantToListenList.test.tsx` (marcador, conteo con y sin más páginas, anuncio, error por entrada, estado vacío con enlace, textos nuevos) y del hook.
- [x] 5.2 `docs/05-features/listening-diary-and-ratings.md`: sección sobre la página de Pendientes.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador (escritorio y 375 px) desde el worktree, en las tres vistas.
