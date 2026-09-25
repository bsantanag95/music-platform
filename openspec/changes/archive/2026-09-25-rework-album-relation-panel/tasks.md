## 1. Datos del servidor

- [x] 1.1 En `src/services/catalog/album-personal.ts`, reemplazar `ownListCount` por `ownListMemberships` (`listId`, `itemId`, `kind`, `title`), solo `kind IN ('standard','custom_journey')` y sin Caminos archivados (D1)
- [x] 1.2 Propagar `ownListMemberships` por `album-data.ts` (`loadPersonalState`), el layout de pestañas y `AlbumRelationState`
- [x] 1.3 Actualizar los tests de `album-personal` / `album-data` para la nueva forma y la exclusión de recorridos de artista y Caminos archivados

## 2. Rango de puntaje detallado

- [x] 2.1 Crear `src/lib/rating-range.ts` con `scoreRange(stars)` e `isScoreCoherent(stars, score)`, espejo del `CHECK` de `rating` (D3)
- [x] 2.2 Tests unitarios de los bordes (½★ → 1–10, 1★ → 11–20, 5★ → 91–100, valores fuera de tramo)

## 3. Input de estrellas y diálogo

- [x] 3.1 Crear `src/components/social/StarRatingInput.tsx`: grupo de radios ½–5, medias estrellas por mitad de glifo, previsualización con el puntero, flechas ±½, área táctil ≥ 40 px, valor anunciado
- [x] 3.2 Tests de `StarRatingInput` (clic en mitad izquierda/derecha, teclado, `aria-checked`)
- [x] 3.3 Crear `RatingDetailDialog` sobre `ui/Dialog`: puntaje limitado al tramo, guardar, destacar/quitar destacada, "Borrar nota" con `ConfirmDialog`; Escape devuelve el foco
- [x] 3.4 Tests del diálogo (tramo por estrellas, deshabilitado sin estrellas, borrar)

## 4. Selector de listas

- [x] 4.1 Crear `src/components/album/AlbumListPicker.tsx` (D2): buscador con debounce, `useInfiniteQuery` sobre `getMyLists` (`entityType: "release-group"`, `q`), "Cargar más", pertenencias primero, Caminos de `getMyCaminos` filtrados por estado y `q`
- [x] 4.2 Casillas optimistas: alta (`addItemToList`, `addAlbumToCamino`) y baja (`removeItemFromList` con `itemId`, `removeAlbumFromCamino`), casilla en vuelo deshabilitada, reversión + alerta ante error
- [x] 4.3 "+ Nueva" por sección con `ListForm` / `CaminoForm`; al crear, alta y casilla marcada; alto máximo con scroll interno; Escape cierra y devuelve el foco
- [x] 4.4 Tests: pertenencia inicial marcada (incluida una lista fuera de la primera página), desmarcar quita, error revierte, búsqueda consulta con `q`, Camino archivado oculto, crear lista la deja marcada

## 5. Panel "Tu relación"

- [x] 5.1 Reescribir `AlbumRelationPanel` con el orden de D6; retirar `moreOpen`, `mobileSecondary`, "Más acciones" y "Ver en listas"
- [x] 5.2 Fila "Nota": `StarRatingInput` con guardado optimista, descarte del puntaje incoherente con aviso `role="status"`, botón de puntaje que abre `RatingDetailDialog`
- [x] 5.3 Fila "Reseña": "Escrita · Editar" / "Escribir reseña", manteniendo el ancla y `revealReviewComposer`
- [x] 5.4 Fila "Escuchas": valor "N · última fecha" / "Ninguna", "+ Registrar" fijo, confirmación "Escucha registrada · Agregar detalles" que abre `ListenEntryForm` bajo demanda (D4)
- [x] 5.5 Conmutadores Favorito / Pendiente con íconos SVG corazón y marcador, `aria-pressed`, sin "Agregar/Quitar" (D5); registrar escucha desactiva Pendiente
- [x] 5.6 Colección siempre visible (estado + "Gestionar" o "Agregar"), conservando el deep-link `?collection=`
- [x] 5.7 Fila de listas: "En N de tus listas" desde `ownListMemberships` + botón "Listas" que abre `AlbumListPicker`; el conteo se actualiza al cerrar
- [x] 5.8 Actualizar `messages/{es,en}/catalog.json` (`catalog.album.relation`): rótulos sin "Tu", nuevas claves (escuchas, confirmación, conmutadores, aviso de puntaje, selector); quitar claves huérfanas (`more`, `showInLists`, `add`, `remove`, `logAnother`) si ya no se usan
- [x] 5.9 Reescribir `AlbumRelationPanel.test.tsx` según los escenarios de la spec `album-personal-panel` (sin `···` en móvil, valoración en línea, aviso de puntaje quitado, confirmación de escucha, conmutadores)

## 6. Bloque de comunidad y cabecera

- [x] 6.1 `CommunityStats`: tres tarjetas (`sm:grid-cols-3`), umbral como `<5` con `sr-only` "menos de 5" y `title`; enlace "Aparece en N listas" solo con N > 0 (D7)
- [x] 6.2 Actualizar `AlbumHeader.test.tsx` (tres tarjetas, `<5` accesible, sin enlace con 0 listas)
- [x] 6.3 Layout de pestañas: cuarta fila de relleno en `lg` (`auto auto auto 1fr`) para que el panel no separe identidad, ficha y comunidad (D8)

## 7. Documentación y verificación

- [x] 7.1 Revisar `docs/05-features/catalog-browsing.md`, `ratings-and-reviews.md` y `physical-collection.md` y actualizar las menciones al panel (menú `···`, "Más acciones", formulario de valoración, "Ver en listas")
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 7.3 Verificar en el navegador (escritorio y móvil): valorar con medias estrellas y teclado, cambio de estrellas con puntaje incoherente, registrar escucha, conmutadores, selector con muchas listas y Caminos, cabecera estable al abrir el selector
- [ ] 7.4 Al archivar: agregar `## Purpose` a `openspec/specs/album-list-picker/spec.md`
