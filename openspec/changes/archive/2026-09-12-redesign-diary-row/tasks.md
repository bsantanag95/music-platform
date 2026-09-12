## 1. Primitivo de menú "···"

- [x] 1.1 Crear `src/components/ui/RowMenu.tsx`: botón `aria-haspopup="menu" aria-expanded`, `<ul
      role="menu">` posicionado `absolute` bajo el trigger, ítems como `<button role="menuitem">`,
      cierre con `Escape`, al elegir un ítem, o con click fuera (`mousedown` global mientras está
      abierto). Sin dependencia nueva.
- [x] 1.2 Test de `RowMenu`: abre/cierra con click, cierra con `Escape`, cierra con click fuera,
      navegación con teclado entre ítems.

## 2. Bloque de fecha calendario

- [x] 2.1 Extraer helper `monthKey(date)` (mismo criterio `${año}-${mes}` que ya usa `groupByMonth`
      en `DiaryActivityList.tsx`) a un módulo compartido para no duplicar el cálculo.
- [x] 2.2 Agregar componente `DiaryDateBlock({ iso, showMonth })` en `feed-row-parts.tsx`: renderiza
      mes abreviado (`Intl.DateTimeFormat(locale, { month: "short" })`) + año cuando `showMonth`,
      día siempre, dentro de un `<time dateTime={iso} title={relativeLabel}>` con la fecha relativa
      como valor accesible. No modifica `RelativeDate` (sigue usándose tal cual en el feed).
- [x] 2.3 En `DiaryActivityList.tsx`, calcular `showMonth` por fila comparando `monthKey` contra la
      entrada anterior de la lista ya cargada (aplica también en la vista de lista, no en
      Cronología) y renderizar `DiaryDateBlock` en lugar de `RelativeDate`.
- [x] 2.4 Test: dos filas del mismo mes solo muestran mes en la primera; cambio de mes muestra mes
      en ambas; el tooltip/valor accesible expone la fecha relativa.

## 3. Columna de reacción solo-ícono

- [x] 3.1 Agregar `ReactionGlyph({ reaction })` (o extender `ReactionIcons.tsx`) que renderiza el
      ícono de `REACTION_ICONS` en tamaño mayor (18–20px) con `role="img"`, `aria-label` con el
      nombre localizado, y `title` para hover con mouse; retorna `null` si no hay reacción.
- [x] 3.2 En `DiaryActivityList.tsx`, mover el ícono de reacción de la línea de metadato (hoy vía
      `ReactionBadge`) a una columna angosta propia de la fila; la línea de metadato deja de incluir
      el ícono/texto de reacción.
- [x] 3.3 Verificar que `ReactionBadge` (feed y otros consumidores) no cambia — sigue mostrando
      ícono + texto siempre visible.
- [x] 3.4 Test: entrada con reacción muestra el ícono con `aria-label` correcto; entrada sin
      reacción no muestra ningún ícono en la columna.

## 4. Acciones de fila: editar como ícono + menú "···"

- [x] 4.1 Reemplazar el botón de texto "Editar"/"Ampliar" por un botón solo-ícono (lápiz),
      `aria-label` localizado, mismo comportamiento (`setExpandedId`).
- [x] 4.2 Agregar `RowMenu` a la fila con el ítem "Eliminar", moviendo la lógica existente
      (`pendingDeleteId`, `handleDelete`) para que se dispare desde el menú; el bloque de
      confirmación inline existente no cambia.
- [x] 4.3 Test: click en lápiz abre/cierra el panel de ampliación; "Eliminar" desde el menú dispara
      el mismo flujo de confirmación que hoy.

## 5. Registrar otra escucha desde la fila

- [x] 5.1 Agregar helper `addCachedEntry` simétrico a `updateCachedEntry`/`removeCachedEntry` en
      `DiaryActivityList.tsx` para insertar una entrada nueva al principio de la caché de
      TanStack Query.
- [x] 5.2 Agregar ítem "Registrar otra escucha" al `RowMenu`: crea la entrada con el mismo patrón de
      `MarkAsListened.tsx` sobre el objetivo de esa fila, la agrega con `addCachedEntry`, y abre su
      panel de ampliación (`expandedId`) de inmediato.
- [x] 5.3 Test: elegir "Registrar otra escucha" crea una entrada nueva visible al principio del
      listado con el formulario de ampliación ya abierto.

## 6. Agregar a lista desde la fila

- [x] 6.1 Extraer de `src/components/lists/AddToListButton.tsx` el panel interno (carga de
      `getMyLists` filtrado por `entityType`, `addItemToList`, creación de lista nueva) a un
      subcomponente `AddToListPanel` reutilizable, manteniendo la firma pública de
      `AddToListButton` (`target`, `authenticated`) sin cambios.
- [x] 6.2 Agregar ítem "Agregar a lista" al `RowMenu` que abre `AddToListPanel` dentro del menú para
      el objetivo de esa fila.
- [x] 6.3 Test: `AddToListButton` (uso existente en catálogo) sigue pasando sus tests actuales sin
      cambios de aserciones; nuevo test cubre agregar a lista desde la fila del diario, y el caso
      sin listas compatibles ofreciendo crear una nueva.

## 7. Ancho de página e integración

- [x] 7.1 Cambiar `max-w-2xl` a `max-w-3xl` en `src/app/[locale]/me/diary/page.tsx`.
- [x] 7.2 Verificar que la fila colapsa correctamente en mobile (columnas de fecha/reacción no
      rompen el layout en viewports angostos).

## 8. i18n

- [x] 8.1 Agregar/ajustar claves de `diary.*` en ES/EN: `aria-label` de editar, del trigger del
      menú, de los ítems "Eliminar"/"Registrar otra escucha"/"Agregar a lista", y el nombre
      accesible de cada reacción si falta alguno.

## 9. Validación

- [x] 9.1 `typecheck`, `lint`, `test`, `build` en verde.
- [x] 9.2 `openspec validate redesign-diary-row --strict`.

## 10. Ajustes tras revisión visual (feedback directo sobre la UI real)

- [x] 10.1 Retirar la vista de Lista y el conmutador Lista/Cronología: la Cronología (agrupada por
      mes) pasa a ser la única presentación de `/me/diary`.
- [x] 10.2 Cambiar `DiaryDateBlock` de `showMonth` a `showDay`: nunca repetir el mes por fila (ya
      vive solo en el encabezado del grupo), y deduplicar el número de día entre filas consecutivas
      del mismo día dentro de un grupo de mes (nuevo helper `dayKey`, hermano de `monthKey`).
- [x] 10.3 Mover `ReactionGlyph` de una columna fija al inicio de la fila a vivir junto al título del
      objetivo — la columna fija se desaparecía sin reacción y desalineaba la carátula y el resto de
      columnas de las filas vecinas.
- [x] 10.4 Corregir el tamaño de texto de `RowMenu` (`text-sm` → `text-xs`) para que coincida con el
      resto de los datos de la fila (contexto, audiencia).
- [x] 10.5 Actualizar `DiaryActivityList.test.tsx` para el nuevo comportamiento (sin conmutador,
      dedup por día, reacción junto al título) y `design.md`/`specs/listen-diary/spec.md` para
      reflejar las decisiones revisadas.
- [x] 10.6 Verificar en el navegador con datos reales: dos escuchas del mismo día no repiten el
      número de día, la reacción no desalinea filas vecinas con/sin reacción, y el texto del menú
      coincide en tamaño con el resto de la fila (12px, `text-xs`).
- [x] 10.7 `typecheck`, `lint`, `test` (suite completa), `build` y `openspec validate --strict` en
      verde tras estos ajustes.

## 11. Segundo ajuste de la reacción (seguía sin encajar junto al título)

- [x] 11.1 Mover `ReactionGlyph` del renglón del título al cluster de acciones de la derecha (junto a
      audiencia, antes del lápiz y el menú "···") — junto al título, un nombre de artista/álbum de
      longitud variable hacía que el ícono terminara en una posición horizontal distinta en cada
      fila, disperso y difícil de escanear.
- [x] 11.2 Corregir la causa real del desajuste: `ReactionGlyph` ya no retorna `null` sin reacción —
      siempre renderiza el mismo `<span>` de ancho fijo (`w-5 shrink-0`), vacío y `aria-hidden` sin
      reacción. Así el lápiz y el menú quedan en la misma posición horizontal en todas las filas.
- [x] 11.3 Actualizar `DiaryActivityList.test.tsx`: la reacción vive en el cluster de acciones: un
      test nuevo confirma que el slot de ancho fijo existe en el DOM con o sin reacción (no
      geometría de layout, que jsdom no calcula de verdad).
- [x] 11.4 Verificar en el navegador con filas reales (con y sin reacción) que `getBoundingClientRect().left`
      del lápiz y del menú coinciden exactamente entre filas.
- [x] 11.5 Actualizar `design.md`/`specs/listen-diary/spec.md` con la ubicación final y la lección
      (la causa era no reservar el espacio, no la ubicación en sí).
- [x] 11.6 `typecheck`, `lint`, `test` (suite completa), `build` y `openspec validate --strict` en
      verde tras este segundo ajuste.

## 12. Enlace de artista en álbumes/canciones (extiende `add-feed-artist-link` al diario)

- [x] 12.1 En `src/services/diary/diary.ts`: importar `PRIMARY_ARTIST_ID_SQL` de
      `@/services/feed/feed`; agregar `artistId: string | null` a `DiaryTargetInfo`; sumar
      `creditedArtistId: PRIMARY_ARTIST_ID_SQL(...)` a `selectEntries()`; mapear `artistId` en
      `serializeEntry` (`null` para objetivos de tipo artista, `row.creditedArtistId ?? null` para
      álbum/canción).
- [x] 12.2 En `src/components/diary/DiaryActivityList.tsx`: pasar
      `artistHref={entry.target.artistId ? targetHref("artist", entry.target.artistId) : null}` a
      `TargetTitle`, igual que `FeedActivityList`. Sin cambios en `TargetTitle` ni en
      `ListenTargetInfoSchema` (`artistId` ya era opcional/nulo ahí).
- [x] 12.3 Test de servicio (`diary.test.ts`): álbum/canción con artista acreditado mapea
      `target.artistId`; objetivo de tipo artista y álbum/canción sin artista acreditado mapean
      `artistId: null`.
- [x] 12.4 Test de componente (`DiaryActivityList.test.tsx`): el nombre del artista se muestra como
      enlace a `/artist/:id` cuando hay artista acreditado; sin él, como texto plano.
- [x] 12.5 Verificar en el navegador con datos reales: registrar una escucha de un álbum enlaza el
      nombre del artista acreditado a su página.
- [x] 12.6 `typecheck`, `lint`, `test` (suite completa), `build` y `openspec validate --strict` en
      verde.
