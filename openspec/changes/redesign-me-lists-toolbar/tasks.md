## 1. API

- [x] 1.1 `counts` en `listMyLists` y `listSavedLists` (sin filtros), con esquemas y cliente.
- [x] 1.2 `listSavedLists` con `q`, `entityType` y `sort`; la ruta los valida.
- [x] 1.3 `docs/04-api/contracts.md`.

## 2. Cabecera y pestañas

- [x] 2.1 `NewListButton` con diálogo en la cabecera; `?new=1`; sin formulario en línea.
- [x] 2.2 Pestañas con total vivo; enlace "Descubrir en Comunidad"; `?tab=discover` redirige; borrar `DiscoverListsTab`.

## 3. Barra

- [x] 3.1 `ListTypeSegments` y `ListSortSelect`; `ListsToolbar` los usa.
- [x] 3.2 Guardadas con la barra y filtros en la URL.

## 4. Cierre

- [x] 4.1 Pruebas de servicio, ruta y componentes.
- [x] 4.2 `docs/05-features/lists-and-favorites.md`.
- [x] 4.3 typecheck, lint, test y build; navegador a 1280 y 375 px.
