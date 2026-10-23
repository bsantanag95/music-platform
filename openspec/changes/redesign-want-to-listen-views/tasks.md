## 1. API

- [x] 1.1 Servicio: foto del artista en `coverThumbUrl`, `year` y `category` de álbumes; pruebas.
- [x] 1.2 `schemas.ts`: `year` y `category` opcionales en `WantToListenTargetInfoSchema`.

## 2. Acciones

- [x] 2.1 `EntryActions` (menú `⋯`: Ya lo escuché, discografía, Añadir a una lista, Quitar).
- [x] 2.2 `PendingUndoToast` (6 s, Deshacer) y lógica en `WantToListenList`: ya lo escuché, quitar inmediato, deshacer de ambos, recarga de página 1.
- [x] 2.3 Borrar `RemoveEntryButton` y `WantToListenArtistJourneyAction`; textos nuevos en `wantToListen.json` es/en.

## 3. Vistas

- [x] 3.1 `EntryMedia` (carátula o foto en círculo, respaldo `ArtistPlate`) y `EntryMeta` (artista · año · tipo, anotado hace X).
- [x] 3.2 Detallada con divisores, "Ya lo escuché" desde `sm`, etiqueta "Discografía en curso".
- [x] 3.3 Índice como `<table>`.
- [x] 3.4 Gráfico con pie de foto y `⋯` sobre la carátula.

## 4. Pruebas, documentación y verificación

- [x] 4.1 Pruebas: menú, ya lo escuché + deshacer, quitar + deshacer, errores, tabla, foto y metadatos.
- [x] 4.2 `docs/04-api/contracts.md` y `docs/05-features/listening-diary-and-ratings.md` §12.
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 4.4 Verificación en el navegador (escritorio y 375 px) desde el worktree.
