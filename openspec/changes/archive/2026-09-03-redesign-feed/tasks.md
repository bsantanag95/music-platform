> Este change se implementó en una primera iteración (modelo pesada/liviana, filas de una
> línea, sin cambio de datos) y después se amplió con el brief de `/impeccable shape`:
> anatomía de fila nueva, `artistName` en el payload, rating VU, reencuadre de
> "Tu rastro reciente" y agrupación. Las tareas de fundación quedan marcadas; el resto
> es el delta a llevar al código con `/opsx:apply`.

## 1. Fundación (hecha en la 1ª iteración)

- [x] 1.1 `esFeedEntryConTexto` / `isFeedEntryWithText` en `feed-entry-weight.ts` — la
  regla de peso no cambia.
- [x] 1.2 Helper de fecha relativa con `useFormatter().relativeTime` + `useNow()`;
  `<time dateTime>` con el ISO. `now: new Date()` en `getRequestConfig`.
- [x] 1.3 `FeedActivityList` montado por `FeedList` (`/me/feed`), `FeedPreview` y
  `RecentSelfActivity`; `CommunityActivity` / `PublicLists` con su fila densa propia.
- [x] 1.4 `/me/feed` a `max-w-2xl`; previews de Inicio a `max-w-3xl`. Namespace `feed` en
  `i18n-test-utils`.

## 2. Payload del feed: `artistName`

- [x] 2.1 `src/lib/api/schemas.ts`: `artistName: z.string().nullable().optional()` en
  `ListenTargetInfoSchema`, `FavoriteTargetInfoSchema` y `FeedTargetInfoSchema`
  (opcional para no romper a los productores del diario/favoritos que no lo pueblan).
  Interfaces locales de `feed.ts` con `artistName: string | null`. — `/impeccable layout`
- [x] 2.2 `src/services/feed/feed.ts`: helper exportado `PRIMARY_ARTIST_SQL` (subquery
  escalar sobre `credit` con `role='primary'`, `ORDER BY position LIMIT 1`, sin
  multiplicar filas). Se usa en las 4 fuentes con objetivo (listen/favorite/rating/
  comment); `null` natural para objetivos de tipo artista. `listMyRecentActivity` en
  `home.ts` reusa el helper; `listCommunityActivity` deja `artistName: null` (el bloque
  compacto no lo muestra). — `/impeccable layout`
- [x] 2.3 `src/services/feed/feed.test.ts`: objetivo de álbum → artista acreditado;
  objetivo de artista → `artistName` null. — `/impeccable layout`
- [x] 2.4 `route.test.ts`: `artistName` es opcional, los fixtures actuales siguen
  validando. Contrato actualizado en `docs/04-api/contracts.md`. — `/impeccable polish`

## 3. Anatomía de fila (`FeedActivityList`)

- [x] 3.1 Celda izquierda `size-11 sm:size-12` (44/48px) en toda fila del feed (`variant
  "feed"`): `CoverThumb` — carátula del objetivo si la tiene, disco de vinilo si no.
  `coverForEntry` cubre los 5 `kind`. Decorativa (`label=""`). — `/impeccable layout`
- [x] 3.2 Título del objetivo como elemento dominante: `font-display`, tamaño consistente
  (`text-base`, mismo en pesadas y livianas), enlazado, en su propia línea.
  *(subrayado persistente → pasa a `/impeccable colorize`)* — `/impeccable typeset`
- [x] 3.3 Línea de metadato mono encima del título: `autor · verbo · audiencia` +
  fecha relativa a la derecha (`font-data text-xs text-paper-muted`; autor en
  `text-paper`). `MetaLine` compartido por filas pesadas y livianas. — `/impeccable typeset`
- [x] 3.4 Artista bajo el título en `font-data text-xs text-paper-muted`, cuando
  `target.artistName` existe (álbum y canción). — `/impeccable layout`
- [x] 3.5 `ProsePanel`: la prosa de las pesadas sobre `rounded-md border border-ink-border
  bg-ink-surface px-3 py-2`, `font-body text-sm`, `max-w-[60ch]`. Solo el texto, no la
  fila. Sin sombra. — `/impeccable layout`
- [x] 3.6 Filas como `<li>` con `MetaLine`/`TargetTitle`/`ProsePanel` — se fue el `<p>`
  con enlaces sueltos y `·` de texto. *(atar el verbo al ítem vía `aria` → `/impeccable
  harden`)* — `/impeccable layout`
- [x] 3.7 Filas reescritas: `<li>` → `[FeedCell] [MetaLine + TargetTitle + EntryReaction
  + ProsePanel]`. Se fue el `<p>` con enlaces sueltos y el gate de carátula. — `/impeccable layout`

## 4. Rating tipo VU meter

- [x] 4.1 `src/components/feed/FeedRatingMeter.tsx` display-only: escalera de 5 marcas
  `bg-amber` crecientes (8→16px), media marca por `.5` vía overlay `absolute` (sin
  gradiente), `role="img"` + `aria-label` legible; marcas `aria-hidden`. — `/impeccable colorize`
- [x] 4.2 Valor numérico en `font-data` `text-amber` siempre al lado (`4.5`), con el
  `detailedScore` cuando existe (`4.5 · 87`). — `/impeccable colorize`
- [x] 4.3 En la línea de sustancia de la fila del rating. `actionLabel` del rating pasó
  a un verbo corto (`ratingVerb` = "Valoró"). Único ámbar en reposo del feed; el título
  gana subrayado persistente `decoration-ink-border` (→ `amber` en hover). — `/impeccable colorize`
- [x] 4.4 `feed.json` ×2: `ratingVerb`, `ratingMeterLabel`, `ratingMeterLabelScore`.
  `ratingLabel` se eliminó después (ver 11.x). — `/impeccable colorize`

## 5. "Tu rastro reciente" — reencuadre

- [x] 5.1 `FeedActivityList` gana `variant?: "feed" | "self"`. `variant="self"` omite
  `FeedCell` y el `AuthorLink` de `MetaLine`. `RecentSelfActivity` lo pasa. — `/impeccable layout`
- [x] 5.2 `variant="self"`: `<ul>` con `border-l border-ink-border`, filas `pl-4`. — `/impeccable layout`
- [x] 5.3 `RecentSelfActivity` mantiene header, "Ver diario", `return null`, peso, prosa,
  rating y agrupación (todo lo maneja `FeedActivityList variant="self"`). — `/impeccable layout`

## 6. Agrupación de actividad ambiente

- [x] 6.1 `groupAmbientRuns` en `src/components/feed/feed-grouping.ts`: pliega 3+
  consecutivas del mismo `kind` de sola presencia y mismo autor. `isAmbient` excluye
  comentarios y escuchas con nota (vía `isFeedEntryWithText`). — `/impeccable distill`
- [x] 6.2 `GroupRow` en `FeedActivityList`: `[autor ·] registró N escuchas` + 4 títulos
  enlazados + `y M más` (→ perfil del autor), un timestamp. Fila subordinada: sin celda,
  indentada a la columna del título (`pl-14 sm:pl-16`), o `pl-4` en `self`. — `/impeccable distill`
- [x] 6.3 `FeedActivityList` mapea `groupAmbientRuns(entries)` y ramifica en
  `row.kind === "group"`. Corre en cliente sobre el array acumulado → colapsa también a
  través de un "cargar más". — `/impeccable distill`
- [x] 6.4 `feed-grouping.test.ts` (7 casos: 3 colapsan, 2 no, comentario corta, nota
  corta, favorito≠escucha, autores distintos, fecha del grupo) + caso en
  `FeedActivityList.test.tsx`. — `/impeccable distill`

## 7. Unificación de fecha y pulido

- [x] 7.1 `CompactActivityRow` / `CompactListRow` usan `relativeFeedDate`
  (`feed-dates.ts`, server, `now` global). Una sola convención de fecha por página. — `/impeccable polish`
- [x] 7.2 Los enlaces de autor de los bloques compactos pasan a `hover:text-amber`
  (antes `hover:text-paper`) — interacción consistente con `FeedActivityList`; el tono
  en reposo queda por densidad de contexto. — `/impeccable polish`
- [x] 7.3 `ratingLabel` eliminado (ES/EN). `FeedEntryBody` (el único que lo usaba, en
  código muerto) pasa a `Valoró · ★ {Number(stars)}`, igual que `CompactActivityRow`.
  El bug de plural "1 estrellas" desaparece con el string. — `/impeccable polish`
- [x] 7.4 En error: el `role="alert"` va arriba y el botón pasa a "Reintentar"
  (`feed.json` `retry`). — `/impeccable polish`

## 8. i18n

- [x] 8.1 `feed.json` ×2: `ratingVerb`, `ratingMeterLabel(Score)`, `groupListens`,
  `groupFavorites`, `groupMore`. Paridad ES/EN verde. — `/impeccable colorize` + `distill`

## 9. Tests

- [x] 9.1 `FeedActivityList.test.tsx`: celda en toda fila, artista bajo el título, panel
  de prosa, rating con meter + número, grupo 3+, variante self. — pasadas layout/colorize/distill
- [x] 9.2 Cubierto por `FeedActivityList.test.tsx` (variant self: sin celda ni autor) y
  `FeedPreview.test.tsx` (`RecentSelfActivity` null sin entradas / render con datos).
- [x] 9.3 `feed-grouping.test.ts` (7) + `FeedRatingMeter.test.tsx` (4: valor, score,
  aria, media marca). — pasadas colorize/distill
- [x] 9.4 `feed.test.ts`: artista acreditado en álbum / null en artista. `route.test.ts`
  sin cambios (campo opcional). — pasada layout
- [x] 9.5 Suite completa en verde (98 files, 595 tests). — `/impeccable polish`

## 10. Verificación y cierre

- [x] 10.1 Revisión visual del usuario en `/me/feed` y el Inicio con sesión: correcto.
- [x] 10.2 `tsc` + `eslint .` + `vitest` (595) + `next build` en verde. Detector de
  Impeccable limpio sobre los 10 archivos del feed. — `/impeccable polish`
- [x] 10.3 `docs/05-features/activity-feed.md` reescrita (anatomía, peso, rating VU,
  agrupación, variante self, fechas, solo lectura, artistName). `docs/04-api/contracts.md`
  con `artistName` en los `target` del feed. — `/impeccable polish`
- [x] 10.4 `openspec validate redesign-feed --strict` → válido. — `/impeccable polish`

## 11. Limpieza de código muerto

Tras el rediseño, `FeedEntryCard` / `FeedEntryBody` (modo full-width) quedaron sin
render — `CommunityActivity` / `PublicLists` se montan siempre densos.

- [x] 11.1 `targetHref` movido a `src/components/feed/feed-target.ts` (módulo puro,
  Server + Client). Importado por `FeedActivityList`, `CommunityActivity`,
  `PopularCommentsTabs`.
- [x] 11.2 `src/components/feed/FeedEntryBody.tsx` eliminado (`FeedEntryCard`,
  `FeedEntryBody`, `FeedEntryThumb`, `formatFeedDate`).
- [x] 11.3 `CommunityActivity` / `PublicLists`: fuera la rama no-compact, `<ul>` no
  usado y los props `withCover` / `compact`; `compact` fuera de los 4 call sites
  (`AnonymousHome`, `AuthenticatedHome`). `PublicLists` deja de pedir `getTranslations`
  y `getLocale`.
- [x] 11.4 Docs: `activity-feed.md` y `home.md` sin menciones a `FeedEntryBody`.
- [x] 11.5 `tsc` + `eslint .` + `vitest` (595) + `next build` en verde.
