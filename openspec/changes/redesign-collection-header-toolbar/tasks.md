## 1. API y servicio

- [x] 1.1 `group=none` en `COLLECTION_GROUPINGS` (tipos, esquema, parser de filtros) y como defecto en `normalizeSortGroup`; pruebas.
- [x] 1.2 `total` en `listOwnCollection` y `listOwnWanted` y en sus esquemas de respuesta; pruebas de servicio y rutas.

## 2. Encabezado y pestañas

- [x] 2.1 `CollectionTabs` (cliente) con totales iniciales, contexto y `useReportCollectionTotal`; pestañas subrayadas con cifra.
- [x] 2.2 `page.tsx`: descripción, `AddCopyButton` en Tengo, totales iniciales desde el servidor.
- [x] 2.3 `CollectionShelf` y `WantedShelf` informan su `total`.

## 3. Segmentos y barra

- [x] 3.1 `CollectionFormatSegments` reemplaza la línea de conteo y el selector de formato.
- [x] 3.2 `groupEntries` y la barra con `none` ("Sin agrupar") como defecto.
- [x] 3.3 Barra en una línea con selects `boxed`; "Filtros" bajo `sm` con conteo de activos.
- [x] 3.4 Busco: barra en una línea.

## 4. Pruebas, documentación y verificación

- [x] 4.1 Pruebas de componentes (segmentos, pestañas con cifra viva, "Filtros", "Sin agrupar", "Añadir copia").
- [x] 4.2 Docs: `physical-collection.md`, `contracts.md`.
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 4.4 Verificación en el navegador desde el worktree (escritorio y 375 px; Tengo y Busco).
