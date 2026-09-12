## 1. Agregar un ítem a una lista cuenta como actualización

- [x] 1.1 `addItemToList` (`src/services/lists/lists.ts`): capturar el resultado de
      `.returning()` del insert y, solo si insertó una fila nueva (no en el camino
      `onConflictDoNothing` sin efecto), hacer `db.update(userList).set({ updatedAt: new
      Date() })` sobre esa lista.
- [x] 1.2 Test de servicio: agregar un ítem a una lista existente bumpea `updated_at`;
      reintentar agregar un ítem ya presente NO lo bumpea.
- [x] 1.3 Test de `listFeed`/`community-activity`: una lista con un ítem agregado
      recientemente aparece como evento de lista con esa fecha. (Cubierto por el test ya
      existente "distingue evento de lista actualizada por updatedAt > createdAt" — el
      mecanismo es el mismo, no hace falta un test nuevo dedicado.)

## 2. Fuente "seguir a un usuario" en el feed principal

- [x] 2.1 `src/services/feed/feed.ts`: nueva interfaz `FeedFollow` (`kind: "follow"`, `id`,
      `createdAt`, `author`, `followedUser: FeedAuthor`) y nueva fuente en `listFeed`
      sobre `userFollow` (autor = `followerId` en `authorIds`, `status = "accepted"`),
      con la misma regla de visibilidad que usaba `feed-ambient-events` para "seguir
      usuario" (objetivo con perfil público, o el lector ya sigue al objetivo; objetivo
      distinto del lector; sin bloqueo lector↔autor y lector↔objetivo). Fecha =
      `userFollow.updatedAt`.
- [x] 2.2 Sumar `"follow"` a `FeedEntry`/`FeedEntrySchema` discriminado en
      `src/lib/api/schemas.ts` y `src/services/feed/feed.ts` (payload: autor +
      `followedUser` con `id`/`username`/`displayName`). `FEED_KINDS`/`FeedKind` (el enum
      del filtro `?kind=`) queda sin tocar a propósito: "follow" no tiene título que
      buscar y no se especificó como filtro seleccionable.
- [x] 2.3 `src/services/home/home.ts`: misma fuente en `listMyRecentActivity`, acotada a
      `userId = viewerId` (sin regla de visibilidad: es la actividad del propio lector).
- [x] 2.4 `src/services/feed/ambient.ts`: retirar la query y el grupo de "seguir usuario"
      (`userRows`/`userGroups`), quitar `"follow-user"` de `AmbientGroup["kind"]`.
- [x] 2.5 Actualizar tests de `feed.ts`, `home.ts` y `ambient.ts` para la fuente movida.

## 3. Presentación de "seguir a un usuario"

- [x] 3.1 `feed-entry-tier.ts`: `feedEntryTier` devuelve `4` para `kind === "follow"`;
      `isFeedEntryQuote` sigue devolviendo `false` (no es cita).
- [x] 3.2 `feed-grouping.ts`: extender `isGroupable`/`GroupableEntry` para aceptar tier 4
      (`follow`); sumar `"follow"` a `FeedEntryGroup["groupedKind"]`; `GroupRow`/
      `targetLink` ganan una rama para enlazar a la persona seguida en vez de a un
      objetivo de catálogo.
- [x] 3.3 `FeedActivityList.tsx`: rama de render para `kind === "follow"` — una sola
      línea sin `FeedCell`: autor enlazado + verbo + persona seguida enlazada + fecha
      relativa. Sin acciones, igual que el resto del feed.
- [x] 3.4 `FeedAmbientStrip.tsx`: quitar `"follow-user"` de `VERB_KEY` y de cualquier
      texto que lo mencione.
- [x] 3.5 i18n: nuevas claves `feed.followVerb` y `feed.groupFollows`
      (`{count, plural, ...}`) en `messages/{es,en}/feed.json`; se retiró
      `ambient.followUserVerb` (quedaba sin uso).
- [x] 3.6 Tests de `feed-grouping.test.ts` y `FeedActivityList.test.tsx` para la corrida
      de follows y la fila mínima sin celda.

## 4. Glifo por tipo y tratamiento propio de la reseña

- [x] 4.1 Set de íconos SVG inline de 14px (misma familia que `ReactionIcons.tsx`) en
      `FeedKindIcons.tsx`, para `listen`, `favorite`, `list`, `comment`, `review`,
      `follow` — rating queda exento (ya tiene el medidor VU).
- [x] 4.2 `FeedActivityList.tsx` y `CompactActivityRow.tsx`: mostrar el glifo junto al
      verbo de la línea de metadato, siempre acompañado del texto.
- [x] 4.3 Tratamiento propio de reseña: rótulo "Reseña" en `--color-petrol` (con su
      propio glifo), título como titular (`font-display`) en `FeedActivityList` en vez de
      metadato secundario, borde izquierdo en petróleo en `ProsePanel` (`accent="review"`)
      y en la fila de `CompactActivityRow`.
- [x] 4.4 Tests de `FeedActivityList.test.tsx` y `CompactActivityRow.test.tsx` para el
      glifo por tipo y el tratamiento de reseña.

## 5. Verificación

- [x] 5.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (212 archivos, 1397 tests),
      `npm run build` en verde.
- [x] 5.2 Verificación manual en el navegador de `/activity` (anónimo): glifos por tipo y
      tratamiento de reseña visibles en "Recientes" (`CompactActivityRow`), sin errores de
      consola. **No verificado en vivo** `/me/feed` (franja sin "seguir usuario", fila
      inline de "siguió a") ni las pestañas con sesión de `/activity` — requieren una
      sesión autenticada que este entorno no puede crear; cubierto por los tests
      automatizados de `FeedActivityList`, `feed-grouping` y `FeedAmbientStrip`.
- [x] 5.3 Actualizado `docs/05-features/activity-feed.md` con la fuente "seguir a un
      usuario", el fin de su presencia en `feed-ambient-events`, el fix de "agregar ítem
      a lista" y el glifo por tipo + tratamiento de reseña.
