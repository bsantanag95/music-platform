## 1. API y vocabulario

- [x] 1.1 `album.year` en el `select` compartido de colección y búsqueda y en `CollectionAlbumSchema`; pruebas.
- [x] 1.2 `owned` por entrada en `listOwnWanted` (una consulta por lote) y en `WantedEntrySchema`; pruebas.
- [x] 1.3 `ATTRIBUTE_GROUPS` en `vocabulary.ts`.

## 2. Menú y hoja

- [x] 2.1 `Dialog` con `size="sheet"`; pruebas.
- [x] 2.2 `EntryMenu` (editar, audiencias, quitar) con teclado y foco.
- [x] 2.3 `CollectionEditSheet` y `WantedEditSheet`; atributos agrupados en los dos formularios.

## 3. Vistas de Tengo

- [x] 3.1 Estantería: `⋯` sobre la carátula, candado, pie con año y edición.
- [x] 3.2 Lista detallada compacta con insignia, fecha y `⋯`.
- [x] 3.3 Índice como `<table>`.
- [x] 3.4 Quitar `CollectionEntryControls` y el panel en línea.

## 4. Selección y Busco

- [x] 4.1 "Seleccionar todo" y quitar en lote con confirmación; barra en una fila.
- [x] 4.2 Busco: fila compacta, `EntryMenu`, hoja de edición, "Ya tienes".
- [x] 4.3 "Lo conseguí" con elección de formato, compensación y deshacer.

## 5. Pruebas, documentación y verificación

- [x] 5.1 Pruebas de componentes (menú, hoja, vistas, lote, "Lo conseguí", "Ya tienes").
- [x] 5.2 Docs: `physical-collection.md`, `contracts.md`, `business-rules.md`.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador desde el worktree (escritorio y 375 px; tres vistas, hoja y Busco).
