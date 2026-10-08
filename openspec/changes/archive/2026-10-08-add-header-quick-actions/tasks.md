## 1. Marcas sobre un objetivo (API)

- [x] 1.1 Esquema Zod `TargetMarksSchema` (`favorite`, `pending: boolean | null`, `stars`, `detailedScore`) en `src/lib/api/schemas.ts`
- [x] 1.2 Servicio `src/services/catalog/target-marks.ts`: resuelve el objetivo (`resolveSocialTarget`, `ApiError` 404 si no existe) y compone `isFavorited`, `isWantToListen` (`null` para `recording`) y `getOwnRatingRow`; pruebas con la BD mockeada como en `release-group-marks`
- [x] 1.3 Route handler `GET /api/me/marks?type=&id=` con `withErrorHandling`, `requireUser`, validación de `type` (`artist` | `release-group` | `recording`) e `id` UUID → `400 VALIDATION_ERROR`, `Cache-Control: no-store`; prueba de la ruta (200, canción con `pending: null`, 400, 401, 404)
- [x] 1.4 Cliente `src/lib/api/marks.ts` (`getTargetMarks`) vía `apiFetch` + Zod, con su prueba
- [x] 1.5 `docs/04-api/contracts.md`: documentar `GET /api/me/marks` y **corregir** `POST /api/me/favorites` y `POST /api/me/want-to-listen`, que alternan (quitan si ya existe) en vez de ser idempotentes

## 2. Buscador de objetivos compartido

- [x] 2.1 Extraer `TargetPicker` de `RegisterListenDialog` a `src/components/quick-actions/TargetPicker.tsx` (tipo por búsqueda, debounce 300 ms, mínimo 2 letras, estados cargando / error / vacío, solo canciones con grabación identidad); recibe los tipos permitidos y el tipo inicial
- [x] 2.2 Pruebas de `TargetPicker`: un tipo por petición, menos de dos letras no busca, estados de error y sin resultados, restricción de tipos (sin canción)

## 3. Diálogo y chips

- [x] 3.1 `ActionChips` (radiogroup con flechas, `aria-checked`, mismo estilo que `SearchTypeToggle`) con las seis acciones
- [x] 3.2 `QuickActionsDialog`: portal, focus-trap, `Escape`, bloqueo de scroll, retorno de foco; abre siempre en Escucha con el foco en el buscador; al cambiar de chip conserva el texto y el tipo si el chip los admite y descarta el objetivo elegido
- [x] 3.3 `QuickActionsButton` ("+ Añadir") y montaje en `Header.tsx` (barra de escritorio y panel móvil), solo con sesión; retirar `RegisterListenButton`
- [x] 3.4 Pruebas del diálogo: abre en Escucha con el foco en el buscador, `Escape` devuelve el foco al control, cambio de chip conserva la búsqueda, navegación de chips con flechas

## 4. Paneles por acción

- [x] 4.1 `ListenPanel`: mover el flujo actual (`createListenEntry` + `ListenEntryForm`, "Registrar otra", enlace al diario) sin cambiar su comportamiento; migrar las pruebas de `RegisterListenDialog.test.tsx`
- [x] 4.2 `RatePanel`: al elegir pide `getTargetMarks`, precarga las estrellas, guarda al tocar con `saveRating`, conserva el puntaje detallado si `isScoreCoherent` o lo suelta y avisa, y enlaza a la página del objetivo; pruebas (sin valoración previa, precargada, puntaje incoherente, error)
- [x] 4.3 `MarkPanel` (Favorito y Pendiente): lee `getTargetMarks`; sin marca → `toggleFavorite` / `toggleWantToListen` y "Deshacer" (`removeFavorite` / `removeFromWantToListen`); con marca → informa y ofrece "Quitar", sin mutar; pruebas de ambos caminos y de que elegir un objetivo ya marcado nunca lo quita
- [x] 4.4 `AddToListStep`: monta `AddToListPanel` sobre el objetivo elegido; prueba de que solo se ofrecen listas compatibles con el tipo
- [x] 4.5 `NewListPanel`: título obligatorio + tipo (artistas / álbumes / canciones), `createList` **sin** `audience`; al crear ofrece "Ver lista" (`/me/lists/{id}`) y "Agregar a esta lista" (pasa al chip "A lista" con el tipo fijado); pruebas (sin título no crea, no envía `audience`, paso al chip "A lista")

## 5. i18n y limpieza

- [x] 5.1 Namespace `quickActions` en `messages/es` y `messages/en`, registrado en `src/i18n/request.ts` (y en los proveedores de prueba que lo necesiten); mover allí las claves `diary.global.*` y retirar las que queden sin uso
- [x] 5.2 Retirar `RegisterListenDialog.tsx`, `RegisterListenButton.tsx` y sus pruebas; actualizar `Header.test.tsx` (el control "Añadir" no aparece sin sesión, aparece con sesión, abre el diálogo)

## 6. Documentación

- [x] 6.1 `docs/05-features/phase-5-design.md`: el control del Header pasa de "+ Registrar escucha" a "Añadir" con el diálogo de acciones rápidas
- [x] 6.2 `docs/05-features/listening-diary-and-ratings.md`: el punto de entrada global es la acción Escucha del diálogo
- [x] 6.3 `docs/05-features/activity-feed.md` (línea del Header "Buscador · Explorar · Listas · Registrar"): actualizar el rótulo

## 7. Verificación

- [x] 7.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan
- [x] 7.2 Verificación en el navegador (escritorio y 375 px): abrir con "Añadir", recorrer las seis acciones, comprobar que Favorito / Pendiente sobre un objetivo ya marcado no lo quita, que Nueva lista usa la audiencia por defecto y que no hay desborde horizontal del Header
- [x] 7.3 Al archivar: reemplazar el Purpose "TBD" de `header-quick-actions` en `openspec/specs/`

## 8. Ajustes tras revisión: puntuación 1–100 y ubicación junto al menú

- [x] 8.1 `RatePanel`: campo numérico "Puntuación (1–100, opcional)" bajo las estrellas, precargado con el puntaje vigente; confirmar (Enter / salir del campo) envía solo `{ detailedScore }`, relee `getTargetMarks` y muestra las estrellas derivadas; rechaza vacío fuera de 1–100 o no entero sin llamar al servidor; claves en `quickActions.rate` (es/en)
- [x] 8.2 Pruebas de `RatePanel`: puntuar con el número sin valoración previa (90 → 4,5), puntuación precargada, fuera de rango no guarda, error del servidor restaura el valor
- [x] 8.3 `Header.tsx`: mover `QuickActionsButton` de la barra general a la zona de usuario, antes del menú de usuario y después del selector de idioma; en el panel móvil, a la cabeza del bloque de usuario; actualizar `Header.test.tsx` (orden junto al menú, ausente de la barra general, ausente sin sesión, panel móvil)
- [x] 8.4 Docs: `phase-5-design.md` (el control sale de la barra general y pasa a la zona de usuario) y `activity-feed.md` (quitar "Añadir" de "Buscador · Explorar · Listas")
- [x] 8.5 `typecheck`, `lint`, pruebas del Header y de quick-actions, `build`; verificación en el navegador de la nueva ubicación (escritorio y 375 px) y del campo de puntuación sin escribir en datos reales
