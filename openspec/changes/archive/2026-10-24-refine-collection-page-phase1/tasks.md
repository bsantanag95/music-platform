## 1. Coherencia formato ↔ atributos

- [x] 1.1 `vocabulary.ts`: `incompatibleAttributes(format, attributes)`; pruebas.
- [x] 1.2 `collection.ts`: `addEntry` rechaza atributos incompatibles; `updateEntry` valida contra el formato resultante y quita los que dejan de aplicar cuando solo cambia el formato; pruebas.
- [x] 1.3 `wanted.ts`: lo mismo en `addWantedEntries` y `updateWantedEntry` (formato `null` admite todos); pruebas.
- [x] 1.4 `entryToFormValue` / `wantedEntryToFormValue` limpian los atributos; aviso `incompatibleNotice` en el formulario de edición.

## 2. Quitar con deshacer y avisos

- [x] 2.1 `ui/UndoToast.tsx` genérico (6 s, `role="status"`, sin botón si deshacer falló).
- [x] 2.2 `CollectionShelf`: aviso con deshacer (`addCollectionEntry`), `errorId` + `removeError` bajo la entrada, anuncio `status`.
- [x] 2.3 "Quitar" en la Estantería.
- [x] 2.4 `WantedShelf`: deshacer (`addWantedEntries`), error por entrada, controles con el estilo de Tengo, "Cualquier formato" secundario.

## 3. Vistas, modo y URL

- [x] 3.1 `useCollectionViewMode` devuelve `ready`; marcador y conmutador invisible.
- [x] 3.2 `EntriesIndex`: controles visibles en la fila.
- [x] 3.3 `EntriesDetailed`: sin artista al agrupar por artista; carátula sin estirar.
- [x] 3.4 Selección: tocar la ficha marca, anillo en la marcada, casilla de 24 px con puntero grueso.
- [x] 3.5 `filtersQueryString` + `writeFiltersToUrl` (`replaceState`) en Tengo y Busco.

## 4. Página, selectores, táctil y prioridad

- [x] 4.1 `page.tsx`: `max-w-4xl`, título y pestañas a la izquierda; los estantes dejan `max-w-3xl`.
- [x] 4.2 Anchos de los selectores y "Por fecha de alta".
- [x] 4.3 Áreas táctiles de 44 px con puntero grueso.
- [x] 4.4 `priorityIds` (primeras seis) hacia `CoverThumb`.

## 5. Pruebas, documentación y verificación

- [x] 5.1 Pruebas de componentes (deshacer, error por entrada, Estantería con Quitar, Índice, selección, URL, aviso del formulario, `ready`).
- [x] 5.2 Docs: `physical-collection.md`, `business-rules.md`, `contracts.md`, `errors.md`.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador desde el worktree (escritorio y 375 px; Tengo en los tres modos y Busco).
