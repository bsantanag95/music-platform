## 1. Fuente "seguir a un artista" en el feed principal

- [x] 1.1 `src/services/feed/feed.ts`: nueva interfaz `FeedFollowArtist` (`kind:
      "follow-artist"`, `id`, `createdAt`, `author`, `artist: { id, name }`) y nueva fuente
      en `listFeed` sobre `artistFollow` (autor = `userId` en `authorIds`), sin regla de
      visibilidad adicional más allá de bloqueo lector↔autor (un artista no tiene perfil
      privado). Fecha = `artistFollow.createdAt`.
- [x] 1.2 Sumar `"follow-artist"` a `FeedEntry`/`FeedEntrySchema` discriminado en
      `src/lib/api/schemas.ts` y `src/services/feed/feed.ts` (payload: autor + `artist` con
      `id`/`name`). `FEED_KINDS`/`FeedKind` (el enum del filtro `?kind=`) queda sin tocar a
      propósito, mismo criterio que "follow": no se especificó como filtro seleccionable.
- [x] 1.3 `src/services/home/home.ts`: misma fuente en `listMyRecentActivity`, acotada a
      `userId = viewerId` (sin regla de visibilidad: es la actividad del propio lector).
- [x] 1.4 `src/services/feed/ambient.ts`: retirar la query y el grupo de "seguir artista"
      (`artistRows`/`artistGroups`), quitar `"follow-artist"` de `AmbientGroup["kind"]`.
- [x] 1.5 Actualizar tests de `feed.ts`, `home.ts` y `ambient.ts` para la fuente movida.

## 2. Presentación de "seguir a un artista"

- [x] 2.1 `feed-entry-tier.ts`: `feedEntryTier` devuelve `4` para `kind === "follow-artist"`;
      `isFeedEntryQuote` sigue devolviendo `false` (no es cita).
- [x] 2.2 `feed-grouping.ts`: extender `isGroupable`/`GroupableEntry` para aceptar
      `"follow-artist"`; sumarlo a `FeedEntryGroup["groupedKind"]`; `GroupRow`/`targetLink`
      ganan una rama para enlazar al artista seguido.
- [x] 2.3 `FeedActivityList.tsx`: rama de render para `kind === "follow-artist"` — una sola
      línea sin `FeedCell`: autor enlazado + verbo + artista enlazado + fecha relativa, con
      el mismo glifo de "seguir" que ya usa `kind === "follow"` (`FEED_KIND_ICONS`).
- [x] 2.4 `FeedAmbientStrip.tsx`: quitar `"follow-artist"` de `VERB_KEY` y de cualquier texto
      que lo mencione.
- [x] 2.5 i18n: nuevas claves `feed.followArtistVerb` y `feed.groupFollowArtists`
      (`{count, plural, ...}`) en `messages/{es,en}/feed.json`; se retira
      `ambient.followArtistVerb` (queda sin uso).
- [x] 2.6 Tests de `feed-grouping.test.ts` y `FeedActivityList.test.tsx` para la corrida de
      follows de artista y la fila mínima sin celda.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (212 archivos, 1408 tests),
      `npm run build` en verde.
- [x] 3.2 Verificación manual en el navegador de `/activity` (anónimo): sin regresiones, sin
      errores de consola atribuibles a este cambio. **No verificado en vivo** `/me/feed` ni
      las pestañas con sesión de `/activity` (requieren sesión autenticada, que este entorno
      no puede crear) — cubierto por los tests automatizados de `feed.ts`, `home.ts`,
      `ambient.ts`, `feed-grouping` y `FeedActivityList`.
- [x] 3.3 Actualizar `docs/05-features/activity-feed.md` con la octava fuente y el fin de
      "seguir artista" en `feed-ambient-events`.
