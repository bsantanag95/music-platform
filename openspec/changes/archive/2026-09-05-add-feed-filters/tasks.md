## 1. Servicio: filtros en `listFeed`

- [x] 1.1 `src/services/feed/feed.ts` — agregar parámetro de filtros opcional a `listFeed`
      (`{ kind?, authorId?, q? }`), validando `authorId` contra `followedIds` (`400
      VALIDATION_ERROR` si no pertenece a los seguidos aceptados) antes de ejecutar
      cualquier query.
- [x] 1.2 Cuando `kind` está presente, ejecutar solo la query de esa fuente (saltar las
      otras cuatro) en vez de fusionar y filtrar después.
- [x] 1.3 Cuando `authorId` está presente, usar `eq(x.userId, authorId)` en lugar de
      `inArray(x.userId, followedIds)` en cada fuente consultada.
- [x] 1.4 Cuando `q` está presente, agregar `ilike` sobre las columnas de título ya unidas
      por cada fuente (`artist.name`, `releaseGroup.title`, `recording.title`; `ilike`
      directo sobre `userList.title` para la fuente de listas).
- [x] 1.5 Función liviana para poblar el `<select>` de autor: reusar `listFollowing` si
      alcanza (id + username + displayName, sin paginar) o agregar una función dedicada en
      `services/feed/feed.ts` — decidir contra el Open Question de `design.md`.
      (`listFollowing` topea en 50 — se agregó `listFeedAuthors`, sin paginar.)

## 2. API: `GET /api/me/feed`

- [x] 2.1 `src/app/api/me/feed/route.ts` — parsear y validar `kind`, `authorId`, `q` como
      query params opcionales; `kind` contra el enum cerrado existente
      (`VALIDATION_ERROR` si no pertenece).
- [x] 2.2 `src/lib/api/diary.ts` — extender `getFeed(page, pageSize)` para aceptar un
      cuarto parámetro de filtros opcional (mismo patrón que `DiaryFiltersParams` /
      `getMyDiary`), armando el query string solo con los filtros presentes.
      (La lista de autores para el `<select>` no necesita endpoint propio: `page.tsx` la
      resuelve server-side con `listFeedAuthors` y la pasa como prop — ver 4.1.)

## 3. Componente compartido: extraer `FilterSelect`

- [x] 3.1 Crear `src/components/ui/FilterSelect.tsx` con el componente hoy definido dentro
      de `DiaryActivityList.tsx` (misma API: `value`, `onChange`, `ariaLabel`,
      `widthClassName`, `children`). (Renombrada también la clase CSS de soporte
      `.diary-filter-select` → `.filter-select` en `globals.css`, ya que ahora es
      compartida.)
- [x] 3.2 `src/components/diary/DiaryActivityList.tsx` — importar `FilterSelect` desde
      `@/components/ui/FilterSelect` en vez de la definición local; eliminar la definición
      local.
- [x] 3.3 Confirmar que `DiaryActivityList.test.tsx` sigue pasando sin cambios (el
      componente extraído mantiene la misma API). (20/20 tests en verde.)

## 4. UI de `/me/feed`: barra de filtros y paginación

- [x] 4.1 `src/components/feed/FeedList.tsx` — agregar estado de filtros (`kind`,
      `authorId`, `q`) y barra de filtros (buscador + 2 `FilterSelect`), mismo layout que
      `DiaryActivityList` (buscador en su fila, selects en fila aparte con wrap). El
      `<select>` de autor solo se renderiza si `authors.length > 0`.
- [x] 4.2 Migrar la paginación de `useState` + `handleLoadMore` a `useInfiniteQuery`:
      `queryKey` incluye los filtros vigentes, `initialData` siembra la página 1 sin
      filtros (ya resuelta por `page.tsx`), `placeholderData: keepPreviousData`.
- [x] 4.3 Debounce del buscador (300ms), igual que `DiaryActivityList`.
- [x] 4.4 Botón "Limpiar filtros", visible solo con algún filtro activo.
- [x] 4.5 Estado vacío distinto: "sin resultados para estos filtros" (con filtros activos)
      vs. el vacío real ("no seguís a nadie" / "nadie publicó nada").

## 5. Cierre de mejoras pendientes del critique de `/me/feed`

- [x] 5.1 Mensaje de cierre ("estás al día") cuando se llega al final del feed
      (`!hasNextPage` tras al menos una página cargada). Solo se muestra sin filtros
      activos (con filtros, llegar al final de un resultado acotado no es "estás al día").
- [x] 5.2 CTA "buscar personas" en el estado vacío real (pasar `action` a `EmptyState` en
      `FeedList.tsx`, enlazando a `/users`).
- [x] 5.3 Anuncio `aria-live="polite"` al cargar más entradas (mismo patrón `sr-only` +
      `role="status"` que ya usa `DiaryActivityList` para su confirmación de guardado).

## 6. i18n

- [x] 6.1 `messages/{es,en}/feed.json` — claves nuevas para la barra de filtros
      (`searchPlaceholder`, `kindLabel`, `filterAllKind`, `kind.*`, `authorLabel`,
      `filterAllAuthor`, `clearFilters`, `noResultsTitle`, `noResultsDescription`,
      `caughtUpMessage`, `findPeopleCta`, `loadedAnnouncement`) — reusa nombres de clave
      ya existentes en `diary.json` donde el concepto coincide.

## 7. Tests

- [x] 7.1 `src/services/feed/feed.test.ts` — filtros combinados, `authorId` fuera de los
      seguidos (`VALIDATION_ERROR`), `q` sin coincidencias, `kind` saltea las otras cuatro
      fuentes, `q` en fuente de listas filtra por título de lista (no artist/release/
      recording). (`kind` inválido se valida en la ruta, no en el servicio — cubierto en
      7.2; 16/16 tests en verde.)
- [x] 7.2 `src/app/api/me/feed/route.test.ts` — validación de los tres query params
      nuevos (`kind` inválido, enum completo aceptado, `authorId`/`q` recortado), el
      `VALIDATION_ERROR` del servicio propagado como 400, comportamiento sin params sin
      cambios. (11/11 tests en verde.)
- [x] 7.3 Nuevo `src/components/feed/FeedList.test.tsx` — UI de filtros (tipo, autor,
      búsqueda, combinados), refetch al cambiar un filtro, `<select>` de autor ausente sin
      seguidos, estado vacío "sin resultados" distinto de "sin actividad" (con y sin CTA),
      cierre "estás al día" (presente sin filtros, ausente con filtros), `aria-live` con la
      cantidad cargada. (11/11 tests en verde.)
- [x] 7.4 `src/components/ui/FilterSelect.test.tsx` — no existía cobertura directa; se
      agregó una mínima (valor/aria-label/onChange, clase compartida y ancho). (2/2 tests
      en verde.)

## 8. Verificación final

- [x] 8.1 `npm run typecheck` (via `tsc --noEmit`), `npm run lint`, `npm test -- --run`
      (694/694), `npm run build` — los cuatro en verde.
- [x] 8.2 Verificación manual en navegador (cuenta y seguidos reales, seed de Inicio):
      filtro por tipo, por autor y combinado con búsqueda de texto — todos disparan la
      query esperada y filtran correctamente; mobile (375px) sin overflow; estado vacío
      real con CTA vs. "sin resultados" sin CTA; "Estás al día" al llegar al final sin
      filtros. Foco: el `<input>` de búsqueda confirmado con el anillo ámbar 2px/offset-2px
      correcto vía `:focus-visible`; el `<select>` también matchea `:focus-visible` con el
      ancho/offset correctos, pero `getComputedStyle` reporta `outline-color` en
      paper-muted en vez de ámbar — mismo comportamiento que los `<select>` ya en
      producción de `/me/diary` (componente reusado sin cambios de lógica/estilo), posible
      particularidad de Chromium al leer `outline-color` en un widget nativo reemplazado;
      no se pudo confirmar con captura de píxeles porque el panel del navegador no
      renderizaba en esta sesión. No es una regresión de este cambio — mismo riesgo ya
      aceptado (o no notado) en el `<select>` de diario; se registra como observación, no
      como bloqueante.
      **Bug real encontrado y corregido durante esta verificación:** la búsqueda por texto
      no encontraba entradas por el nombre del artista acreditado de un álbum/canción (solo
      por su propio título) — faltaba la condición `PRIMARY_ARTIST_SQL(...) ILIKE` que
      `listMyDiary` sí tiene. Corregido en `titleSearchCondition` (feed.ts) + test
      reforzado en 7.1.
- [x] 8.3 Detector de diseño de Impeccable sobre los archivos tocados — sin hallazgos
      (`node .claude/skills/impeccable/scripts/detect.mjs --json src/components/feed/FeedList.tsx src/components/ui/FilterSelect.tsx src/components/diary/DiaryActivityList.tsx`).

## 9. Tratamiento de la prosa del feed (feedback tras verificación manual)

- [x] 9.1 `src/components/feed/feed-row-parts.tsx` — `ProsePanel` deja de ser una caja
      (`bg-ink-surface`, borde, `rounded-md`) y pasa a borde izquierdo sin caja, con una
      prop `variant: "impression" | "comment"`: `"impression"` en cursiva y entre comillas
      tipográficas (misma voz que `/me/diary`), `"comment"` en redonda y sin comillas.
- [x] 9.2 `src/components/feed/FeedActivityList.tsx` — pasa `variant` según `row.kind`
      (`"listen"` → `"impression"`, `"comment"` → `"comment"`) en los dos call sites
      (variante `feed` y variante `self`).
- [x] 9.3 `src/components/diary/DiaryActivityList.tsx` — elimina la definición local de
      `ImpressionQuote` (ahora idéntica al `ProsePanel` compartido) y pasa a usar
      `ProsePanel` con `variant="impression"` — sin cambio visual para el diario.
- [x] 9.4 Tests: `FeedActivityList.test.tsx` — un comentario se muestra en redonda sin
      comillas; una nota de escucha se muestra en cursiva entre comillas.
      `DiaryActivityList.test.tsx` — sigue en verde sin cambios (mismas clases exactas).
- [x] 9.5 `openspec/specs/activity-feed/spec.md` (delta) — MODIFIED en el requirement
      "Jerarquía de presentación del feed": el párrafo "Peso de entrada" y los escenarios
      de comentario/nota de escucha reflejan el nuevo tratamiento por cita y la distinción
      de tono; nuevo escenario que fija que la nota de escucha usa la misma voz en feed y
      diario.
- [x] 9.6 Verificación: `npx tsc --noEmit`, `npm run lint`,
      `npm test -- --run src/components/diary/DiaryActivityList.test.tsx src/components/feed/FeedActivityList.test.tsx src/components/feed/FeedList.test.tsx`
      — todos en verde (41 tests).

## 10. Plegado de citas largas en el feed ("Ver más")

- [x] 10.1 `src/components/feed/feed-row-parts.tsx` — `ProsePanel` gana una prop
      `clamp?: boolean` (default `false`). Con `clamp`, mide la altura NATURAL del
      párrafo (antes de recortar) contra `lineHeight × 6` vía `ref` + `useEffect`; si
      desborda, aplica `line-clamp-6` y muestra un botón "Ver más"/"Ver menos"
      (`font-data text-xs`, subrayado punteado — mismo estilo que "Editar"/"Eliminar" de
      `DiaryActivityList`). Sin `clamp` (diario), el comportamiento no cambia.
- [x] 10.2 `src/components/feed/FeedActivityList.tsx` gana su propia prop `clamp?:
      boolean` (default `false`) y la reenvía a los dos call sites de `ProsePanel`
      (variante `feed` y variante `self`). `src/components/feed/FeedList.tsx` (la página
      `/me/feed`) la activa (`<FeedActivityList clamp />`).
      **Corrección durante la verificación**: `ScrollablePreviewList.tsx` (Home —
      `FeedPreview` y `RecentSelfActivity`) también renderiza `FeedActivityList`; una
      primera versión pasaba `clamp` fijo en el JSX interno del componente, así que
      Home también lo heredaba, violando el Non-Goal explícito de no tocar esos dos
      bloques. Corregido convirtiendo `clamp` en prop propia de `FeedActivityList` con
      default `false` — `ScrollablePreviewList` no la pasa, así que Home queda sin
      cambios, tal como se acordó.
- [x] 10.3 `messages/{es,en}/feed.json` — claves `showMore`/`showLess`.
- [x] 10.4 Tests: nuevo `src/components/feed/feed-row-parts.test.tsx` (5 tests, prueba
      `ProsePanel` en aislamiento) — sin `clamp` nunca muestra el botón; con `clamp` sin
      desborde real no lo muestra; con `clamp` y desborde real lo muestra y expande/
      colapsa al click; el tono (cursiva+comillas vs. redonda) se conserva plegado.
      `FeedActivityList.test.tsx` (2 tests nuevos) — con `clamp` en el propio componente
      se ve el botón; sin `clamp` (el mismo caso que dispararía el botón si estuviera
      activo) nunca aparece, cubriendo específicamente la corrección de 10.2.
- [x] 10.5 **Bug real encontrado y corregido durante la verificación manual:**
      comparar `scrollHeight` contra `clientHeight` de un elemento que YA tenía
      `-webkit-line-clamp` aplicado (`line-clamp-6`) daba falsos positivos — Chromium
      reporta ambos valores de forma inconsistente para ese layout (`display:
      -webkit-box`), mostrando "Ver más" incluso en comentarios de una sola oración.
      Corregido midiendo la altura natural (sin recortar) contra `lineHeight × 6` en vez
      de comparar dos alturas del mismo elemento ya recortado. Confirmado en vivo:
      antes del fix, comentarios cortos de una línea mostraban "Ver más" erróneamente;
      después del fix, no. Test de regresión agregado en 10.4 (texto de una sola
      oración con altura natural mockeada por debajo del umbral).
- [x] 10.6 Verificación: `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`,
      detector de diseño de Impeccable sobre los archivos tocados — sin hallazgos.
      Confirmado en navegador (servidor limpio, sin caché de `.next` corrompida por
      reinicios previos): comentarios cortos ya no muestran "Ver más". No se pudo
      confirmar en vivo el caso positivo (comentario realmente largo mostrando y
      expandiendo "Ver más") por una limitación del entorno de esta sesión — el panel
      del navegador no estaba renderizando (`document.visibilityState: "hidden"`
      incluso tras enfocar la pestaña), lo que impidió publicar un comentario de
      prueba de forma confiable. Ese caso quedó cubierto por los tests de 10.4 — y el
      usuario terminó de probarlo en su propio navegador, reportando el bug de
      scroll de la sección 11.

## 11. Corrección de scroll al colapsar una cita ("Ver menos")

- [x] 11.1 **Bug real encontrado por el usuario tras probar 10.x en su propio
      navegador**: al hacer click en "Ver menos" sobre una cita expandida, el contenido
      se encoge de vuelta a 6 líneas pero el scroll del viewport queda donde estaba —
      dejando al usuario mirando lo que quedó mucho más abajo (en el caso reportado,
      el footer del sitio).
- [x] 11.2 `src/components/feed/feed-row-parts.tsx` — `ProsePanel` gana un
      `useLayoutEffect` que, al pasar de expandido a colapsado, llama
      `containerRef.current.scrollIntoView({ block: "nearest" })` sobre el `<div>`
      contenedor. Corre en `useLayoutEffect` (no `useEffect`) para corregir la posición
      ANTES de pintar — la corrección no se ve como un segundo salto. Sin
      `behavior: "smooth"` (es una corrección de posición, no un gesto de scroll —
      sigue la regla de "sin movimiento decorativo" de `DESIGN.md`). No se dispara al
      expandir (el contenido crece, no hay nada que corregir).
- [x] 11.3 `src/test/setup.ts` — jsdom no implementa `scrollIntoView`; se agrega un stub
      no-op global, mismo criterio ya usado ahí para `IntersectionObserver`.
- [x] 11.4 Test: `feed-row-parts.test.tsx` — el test de expandir/colapsar ahora espía
      `Element.prototype.scrollIntoView` y confirma que NO se llama al expandir y que
      SÍ se llama con `{ block: "nearest" }` al colapsar.
- [x] 11.5 Verificación: `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`
      (703/703), detector de diseño de Impeccable sobre `feed-row-parts.tsx` y
      `test/setup.ts` — sin hallazgos.

## 12. Avatar de iniciales del autor en el feed

- [x] 12.1 **Motivación (feedback de usuario, 2026-09-05)**: sin foto de perfil visible,
      el feed no da "sensación de distinción" de quién hizo cada actividad — solo texto
      plano. Letterboxd (la inspiración declarada del producto) siempre muestra avatar +
      username junto al póster/carátula, aunque en un layout de card, no de fila; acá se
      adapta el mismo principio (autor con unidad visual propia) a nuestra fila
      horizontal. No existe foto de perfil real en el producto (`appUser` no tiene
      columna de avatar) — se resuelve con un círculo de iniciales, el mismo patrón que
      GitHub/Slack/Discord usan como *fallback* permanente, no como maqueta descartable.
- [x] 12.2 `src/components/feed/FeedActivityList.tsx` — nuevos `AuthorAvatar` (círculo
      `size-4`, inicial de `displayName` o `username`, `aria-hidden` porque el nombre ya
      lo dice `AuthorLink` al lado) y `AuthorIdentity` (avatar + `AuthorLink` juntos).
      Reemplaza los dos usos de `AuthorLink` suelto en `MetaLine` y `GroupRow`. Alcance
      v1, por decisión explícita: **solo `/me/feed`** — no `/me/diary` (no tiene lista de
      autores, es contenido propio) ni el preview de Inicio (fuera de alcance de este
      cambio).
- [x] 12.3 Paleta: 4 variantes (`bg-petrol/text-paper`, `bg-ink-border/text-paper`,
      `bg-petrol-hover/text-ink`, `bg-paper-muted/text-ink`) — tokens ya existentes en
      `DESIGN.md`, nunca ámbar (reservado por la Regla de Rareza). Variante elegida por
      hash determinístico del `id` del autor (estable; no por `username`, que podría
      cambiar).
- [x] 12.4 Tests nuevos en `FeedActivityList.test.tsx` (5): inicial desde `displayName`;
      inicial desde `username` cuando no hay `displayName`; color determinístico (mismo
      autor → misma clase en dos entradas distintas); nunca usa ámbar; no aparece en el
      rastro propio (`variant="self"`).
- [x] 12.5 **Hallazgo durante la verificación en navegador**: con solo 2 personas
      seguidas en la cuenta de prueba, ambas cayeron en la misma variante de color (1 en
      4 de probabilidad) — siguen siendo distinguibles por la inicial, pero diluye el
      objetivo. Reportado al usuario; sin resolver a propósito (pendiente su decisión
      sobre si expandir a 8 sub-variantes por opacidad de los mismos 4 tokens).
- [x] 12.6 **Bug real reportado por el usuario tras probar en su propio navegador**: el
      círculo se veía desalineado verticalmente respecto al nombre. La causa era
      `align-[-3px]` (ajuste manual a ciegas, sin verificación visual en vivo en el
      momento de escribirlo) en vez de `align-middle` (la técnica estándar para alinear
      un ícono/badge inline junto a texto). Corregido cambiando a `align-middle`.
      Confirmado en navegador: medido centro-a-centro entre el círculo y el texto
      adyacente, diferencia de 0.006px.
- [x] 12.7 Verificación: `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`
      (708/708), detector de diseño de Impeccable sobre `FeedActivityList.tsx` — sin
      hallazgos. Confirmado en navegador: alineación correcta en múltiples filas
      (Fran/Eli), colores y contraste correctos.
