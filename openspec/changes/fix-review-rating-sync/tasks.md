## 1. Compositor: no sobrescribir la valoración vigente

- [x] 1.1 `ReviewComposer.tsx`: derivar `showStarPicker = !review && ownStars === 0` y usarla para el render del selector, para `needsStars` (`showStarPicker && !stars`) y para el envío (`...(showStarPicker && stars ? { stars } : {})`), según design D2
- [x] 1.2 Test (primero, debe fallar sobre el código actual): con `ownStars=0` se elige 3★, el componente se vuelve a renderizar con `ownStars=5` (simula valorar en el panel + `router.refresh`) y se publica; `saveReview` se llama **sin** `stars`
- [x] 1.3 Tests de los otros escenarios: sin valoración previa se envía `stars` elegido; con valoración vigente no aparece el selector y no se envía `stars`; si la valoración se borra (`ownStars` vuelve a 0) el selector reaparece y publicar exige elegir estrellas

## 2. Panel: reflejar la valoración creada fuera de él

- [x] 2.1 `AlbumRelationPanel.tsx` (`AuthenticatedPanel`): guardar la última valoración del servidor vista (por `id`, `stars`, `detailedScore`) y, cuando `state.ratings.own` cambia y `ratingBusy` es falso, reemplazar `own` y `stars` locales, usando el patrón de ajustar estado durante el render (design D3); sin `key` en el panel ni `useEffect`
- [x] 2.2 Test (debe fallar sobre el código actual): se renderiza el panel con `ratings.own = null`, se vuelve a renderizar con `own = { stars: 4 }` y las estrellas muestran 4 y el panel sigue mostrando "reseña escrita" si llega `ownReviewId`
- [x] 2.3 Tests de los límites: con una valoración en vuelo (`ratingBusy`) un valor viejo del servidor no pisa la elección del usuario; el aviso de puntaje descartado (`scoreDropped`) sigue visible tras el re-render con el valor guardado; un diálogo abierto (puntaje detallado) no se cierra al recibir el valor del servidor
- [x] 2.4 Revisar que el resto de estados del panel (escuchas, favorito, Pendiente, colección, listas) no necesita la misma resincronización: confirmar y dejar anotado en el código si algún `useState(state.x)` queda sin resincronizar a propósito

## 3. Documentación y especificación

- [x] 3.1 `docs/05-features/ratings-and-reviews.md`: corregir "crear o editar" por "crear" y documentar que la reseña muestra la valoración vigente (sin copia) y la regla de sincronización compositor ↔ panel
- [x] 3.2 Confirmar que la spec delta de `album-review` y `album-personal-panel` valida con `openspec validate fix-review-rating-sync --strict`

## 4. Verificación

- [x] 4.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` (copiar `.env` al worktree antes del `build`)
- [x] 4.2 En el navegador, con un álbum sin valorar: (a) elegir 3★ en el compositor, valorar 5★ con puntaje detallado en el panel y publicar la reseña: la valoración y el puntaje deben seguir intactos; (b) con otro álbum sin valorar, publicar una reseña con 4★ sin recargar: el panel debe mostrar 4★; (c) borrar la valoración desde el panel: el selector del compositor reaparece
- [ ] 4.3 Limpiar los datos de prueba creados en la BD de desarrollo
