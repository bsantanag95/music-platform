## 1. Modelo de datos

- [x] 1.1 Migración Drizzle `drizzle/0028_wanted_entry.sql`: tabla `wanted_entry` (id, user_id
      FK cascade, release_group_id FK cascade, format nullable con CHECK del conjunto cerrado,
      attributes `text[]` default `'{}'` con CHECK del vocabulario, note nullable con CHECK
      ≤140, created_at/updated_at con trigger, análoga a `drizzle/0012_physical_collection.sql`.
- [x] 1.2 Índices: `(user_id, created_at)`, `(user_id, release_group_id)`, `(release_group_id)`.
- [x] 1.3 Agregar `wantedEntry` a `src/db/schema.ts` (pgTable + checks, siguiendo el patrón de
      `collectionEntry`) y exportar `WantedEntryRow`.
- [x] 1.4 Correr la migración local y verificar `drizzle-kit check`/`generate` sin drift.

## 2. Servicio de dominio

- [x] 2.1 Crear `src/services/collection/wanted.ts`: `addWantedEntries` (lote de 1-10 variantes,
      transacción atómica, valida `releaseGroupId` existe y es `release_group`), `removeWantedEntry`,
      `listOwnWantedEntries` (paginado, `q`, `sort`), `listOwnEntriesForReleaseGroup` (para la
      página de álbum, igual patrón que el existente de colección).
- [x] 2.2 Reutilizar `COLLECTION_FORMATS`, `EDITION_ATTRIBUTES`, `isEditionAttribute`,
      `normalizeAttributes`, `COLLECTION_NOTE_MAX` de `src/services/collection/vocabulary.ts` —
      sin duplicar vocabulario.
- [x] 2.3 Tests unitarios del servicio (`src/services/collection/wanted.test.ts`): alta simple,
      alta en lote válida, lote con una variante inválida no crea nada, formato ausente,
      múltiples entradas por álbum sin deduplicar, independencia con `collection_entry` (agregar
      a wishlist un álbum ya poseído y viceversa, sin efectos cruzados), quitar entrada propia,
      quitar entrada ajena/inexistente devuelve not-found, listado propio con `q`/`sort`.

## 3. Contrato y esquemas

- [x] 3.1 Agregar esquemas Zod en `src/lib/api/schemas.ts`: `WantedEntry`,
      `AddWantedEntriesRequest` (`releaseGroupId` + `entries: 1..10`), request/response de
      listado.
- [x] 3.2 Agregar código de error `WANTED_ENTRY_NOT_FOUND` (404) a `docs/04-api/errors.md`, mismo
      criterio de no revelar existencia de entradas ajenas que `COLLECTION_ENTRY_NOT_FOUND`.
- [x] 3.3 Documentar los endpoints nuevos en `docs/04-api/contracts.md`, junto a la sección
      existente de `/api/me/collection`.

## 4. API routes

- [x] 4.1 `POST /api/me/collection/wanted`: requiere sesión, valida lote (1-10), crea entradas en
      una transacción, responde `201` con las entradas creadas o `400`/`404` según corresponda.
- [x] 4.2 `GET /api/me/collection/wanted?page=&pageSize=&q=&sort=`: requiere sesión, paginado,
      responde solo entradas del usuario autenticado.
- [x] 4.3 `DELETE /api/me/collection/wanted/{entryId}`: requiere sesión, `404` con
      `WANTED_ENTRY_NOT_FOUND` si no existe o no es del usuario.
- [x] 4.4 Tests de rutas (`route.test.ts` por endpoint), espejando
      `src/app/api/me/collection/route.test.ts` y `[entryId]/route.test.ts`: sesión requerida,
      casos de validación, casos de éxito, 404 no revela existencia ajena.

## 5. Cliente API

- [x] 5.1 Agregar `addWantedEntries`, `removeWantedEntry`, `listOwnWantedEntries` a
      `src/lib/api/collection.ts` (o archivo hermano `wanted.ts`), pasando siempre por
      `src/lib/api/client.ts` y validando la respuesta con los esquemas Zod nuevos.

## 6. `CollectionAlbumAction` — bifurcación "La tengo" / "La quiero"

- [x] 6.1 Extender `CollectionAlbumAction.tsx`: al abrir, mostrar un selector
      `role="radiogroup"` con dos opciones ("La tengo" / "La quiero") antes del formulario.
- [x] 6.2 Formulario de "La quiero": permitir agregar una o varias variantes (formato opcional —
      incluir "Cualquier formato" como opción explícita — + atributos multi-selección) antes de
      confirmar; reutilizar `CollectionEntryForm` por variante con `format` opcional vía prop, o
      una variante propia del formulario si la prop opcional ensucia el contrato existente de
      "La tengo" (decidir en implementación, sin tocar el comportamiento actual de "La tengo").
      → se creó `WantedVariantForm.tsx` propio (formato opcional con "Cualquier formato"), sin
      tocar `CollectionEntryForm`.
- [x] 6.3 Listar, debajo de cada opción, las entradas propias correspondientes (colección o
      deseo) para ese álbum, cada una con su acción de quitar — igual patrón que el listado
      actual de copias.
- [x] 6.4 Estados de carga/éxito/error/sesión-requerida para el flujo de "La quiero", mismo
      patrón que el existente.
- [x] 6.5 Tests de componente (`CollectionAlbumAction.test.tsx`): selector inicial, alta de una
      variante, alta de varias variantes en un envío, listado y baja de entradas de deseo, no
      bloqueo cuando el álbum ya está en la colección.
- [x] 6.6 Actualizar `AlbumPage` (`src/app/[locale]/(catalog)/album/[id]/page.tsx`) para cargar y
      pasar también las entradas de deseo propias del álbum (`listOwnWantedEntriesForReleaseGroup`)
      junto a `collectionEntries`.

## 7. Menú "···" de `AlbumCard`

- [x] 7.1 Agregar `RowMenuItem` "Lo quiero" a `AlbumCard.tsx`: alta rápida (una llamada a
      `addWantedEntries` con una variante vacía), confirmación inline, sin abrir formulario.
- [x] 7.2 Agregar `RowMenuItem` "Ya la tengo" que navegue a la página del álbum con el panel de
      colección abierto en la opción "La tengo" (anclaje o query param, siguiendo el patrón ya
      usado para deep-links del proyecto). → `?collection=have`, leído por `AlbumPage` y pasado
      como `initialChoice` a `CollectionAlbumAction`.
- [x] 7.3 Redirigir a login si no hay sesión, mismo patrón que "Mostrar en listas".
- [x] 7.4 Tests de `AlbumCard.test.tsx` (si existe, o crearlo): alta rápida desde el menú, estado
      sin sesión.

## 8. Pestaña "Quiero" en `/me/collection`

- [x] 8.1 Agregar segmento `?tab=wanted` a `/me/collection` (default `tab=own` omitido de la
      URL), con el conmutador de pestañas junto al encabezado existente.
- [x] 8.2 Componente de listado de wishlist (lista simple, sin los tres modos de visualización ni
      filtro/agrupación de la pestaña "Tengo"): álbum, carátula, formato o "cualquier formato",
      atributos, nota, acción de quitar.
- [x] 8.3 Búsqueda por texto (`q`) y orden (`sort`: recencia/alfabético) sobre el listado de
      wishlist, reflejados en la URL cuando difieren del default (mismo criterio que la pestaña
      "Tengo").
- [x] 8.4 Estado vacío localizado con vía hacia el catálogo para empezar a agregar deseos.
- [x] 8.5 Tests de la pestaña: listado, búsqueda sin resultados, baja de una entrada, estado
      vacío, formato ausente ("cualquier formato"). (`WantedShelf.test.tsx`; el cambio de pestaña
      es una navegación `Link` simple entre `/me/collection` y `/me/collection?tab=wanted`, sin
      lógica de cliente que probar aparte.)

## 9. Mensajes e i18n

- [x] 9.1 Agregar claves nuevas a `messages/es/collection.json` y `messages/en/collection.json`:
      selector "La tengo"/"La quiero", formulario de "La quiero" ("Cualquier formato", agregar
      otra variante), ítems del menú "Lo quiero"/"Ya la tengo", pestaña "Quiero", estados vacío
      y de error.

## 10. Documentación

- [x] 10.1 Actualizar `docs/05-features/physical-collection.md`: quitar la wishlist de "Fuera de
      alcance" y describir la nueva superficie (o crear `docs/05-features/collection-wishlist.md`
      espejando el formato del doc existente, con referencia cruzada desde `physical-collection.md`).
      → sección nueva "Wishlist (deseados)" dentro del mismo doc; fila del índice
      `docs/05-features/README.md` actualizada.
- [x] 10.2 Verificar que `docs/04-api/contracts.md` y `errors.md` quedaron sincronizados con los
      endpoints y el código de error nuevos (tarea 3.2/3.3).

## 11. Verificación final

- [x] 11.1 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` en verde.
      → typecheck limpio; lint sin errores (3 warnings preexistentes de `<img>` en tests ajenos a
      este change); test suite completa: 1629 passed, 6 skipped, 7 failed — los 7 fallos son
      preexistentes y no relacionados (confirmado con `git stash`: fallan igual en `main` sin
      estos cambios — `album/[id]/page.test.tsx` por un `act()`/suspense flake y
      `artist/[id]/page.test.tsx` por falta de `DATABASE_URL` en ese archivo de test); build de
      producción exitoso, incluidas las rutas nuevas.
- [x] 11.2 Probar manualmente en el navegador: agregar una variante deseada desde la página de
      álbum, agregar varias variantes en un solo envío, alta rápida desde el menú "···" de una
      ficha en un grid, ver y quitar entradas en la pestaña "Quiero" de `/me/collection`, y
      confirmar que un álbum puede estar simultáneamente en "Tengo" y "Quiero" sin bloqueo.
      → verificado con una cuenta de prueba real contra el dev server: selector "La tengo"/"La
      quiero" al abrir el botón único; alta de una variante con formato + atributo desde la
      página de álbum; el mismo álbum quedó simultáneamente en "Ya la tenés en: Vinilo" y "La
      querés en: Vinilo · Edición limitada" sin bloqueo; pestaña "Quiero" en `/me/collection`
      lista la entrada y la quita correctamente (estado vacío tras quitar); alta rápida "Lo
      quiero" desde el menú "···" de `AlbumCard` en la discografía crea una entrada sin formato
      ("Cualquier formato" en el listado); "Ya la tengo" navega a
      `/album/[id]?collection=have` y abre el panel ya en "La tengo".

## 12. Editar una entrada de deseo

Gap detectado tras revisión: se podía crear y borrar una entrada de deseo, pero no había forma de
especificar o corregir su formato/edición después del alta — en particular tras un alta rápida
"Lo quiero" sin formato desde el menú "···".

- [x] 12.1 `updateWantedEntry(entryId, userId, changes)` en `src/services/collection/wanted.ts`,
      mismo patrón que `updateEntry` de la colección; `format: null` vuelve la entrada a
      "cualquier formato". `WantedEntryChanges` en `wanted-types.ts`.
- [x] 12.2 `UpdateWantedEntryRequestSchema` (al menos un campo) y `WantedEntryResponseSchema` en
      `src/lib/api/schemas.ts`.
- [x] 12.3 `PATCH /api/me/collection/wanted/{entryId}` en la ruta existente del `[entryId]`.
- [x] 12.4 `updateWantedEntry` en `src/lib/api/wanted.ts` (cliente).
- [x] 12.5 `WantedShelf.tsx`: edición en línea por entrada (botón "Editar" junto a "Quitar"),
      reutilizando `WantedVariantForm` con `wantedEntryToFormValue` (nuevo helper en
      `WantedVariantForm.tsx`), actualización optimista con rollback en error — mismo patrón que
      `CollectionEntryControls`/`CollectionShelf`. No se agrega edición en la página de álbum ni
      en el menú "···": mismo criterio que la colección física, donde editar vive solo en
      `/me/collection`.
- [x] 12.6 Tests: servicio (`wanted.test.ts`), ruta (`[entryId]/route.test.ts`), componente
      (`WantedShelf.test.tsx`: editar formato/atributos, volver a "cualquier formato", cancelar).
- [x] 12.7 Spec actualizada (`specs/collection-wishlist/spec.md`, requirement "Editar y quitar una
      entrada de deseo propia") y docs (`contracts.md`, `physical-collection.md`).
- [x] 12.8 `npm run typecheck` y tests de wishlist en verde (42/42). Verificado también en el
      navegador contra el dev server: la entrada creada antes sin formato ("Lo quiero" desde el
      menú "···") mostraba "Cualquier formato"; "Editar" abre el formulario inline con "Guardar
      cambios"/"Cancelar"; se le asignó Vinilo + "Primer prensado" y quedó reflejado de
      inmediato; se volvió a editar y elegir "Cualquier formato" (`format: null`) y el atributo
      se conservó — el ciclo completo crear → editar → volver a "cualquier formato" funciona.
