## 1. API

- [x] 1.1 `schemas.ts`: `WANT_TO_LISTEN_SORTS`, `WantToListenFiltersSchema`, `WantToListenCountsSchema` y `counts` en `WantToListenListResponseSchema`.
- [x] 1.2 `listMyWantToListen`: filtros `type` y `sort` (D2) y `counts` sin el filtro de tipo (D3); pruebas del servicio.
- [x] 1.3 Ruta `GET /api/me/want-to-listen`: validar `type`/`sort` (400 si inválidos); pruebas de la ruta.
- [x] 1.4 `getMyWantToListen(page, pageSize, filters)` en el cliente.

## 2. Cabecera y "Anotar algo"

- [x] 2.1 `QuickActionsDialog`: prop `initialAction` (por defecto `listen`); prueba.
- [x] 2.2 `AddPendingButton` y cabecera de `page.tsx` (título, descripción, botón); la página lee `type`/`sort` de la URL e ignora valores inválidos.
- [x] 2.3 La lista escucha `OWN_DATA_CHANGED_EVENT` y vuelve a pedir la página 1 con los filtros actuales.

## 3. Barra y secciones

- [x] 3.1 `WantToListenTypeSegments` (conteos, `aria-pressed`, tipo sin entradas deshabilitado).
- [x] 3.2 Orden con `FilterSelect` y barra responsive junto al conmutador de modo.
- [x] 3.3 `WantToListenList`: estado de filtros, `replaceState`, recarga de página 1 con descarte de respuestas viejas y `aria-busy`; solo la sección del tipo elegido.
- [x] 3.4 `WantToListenSection`: conteo desde `counts` (se descuenta al quitar).
- [x] 3.5 `wantToListen.json` es/en: textos nuevos.

## 4. Pruebas, documentación y verificación

- [x] 4.1 Pruebas de la lista (segmentos, orden, URL, conteos, refetch por evento, respuestas viejas) y del botón.
- [x] 4.2 `docs/04-api/contracts.md` y `docs/05-features/listening-diary-and-ratings.md` §12.
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 4.4 Verificación en el navegador (escritorio y 375 px) desde el worktree.
