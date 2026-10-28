## Why

La Fase 1 (`refine-feed-page-phase1`) puso `/me/feed` a la altura de `/activity`. La auditoría dejó pendiente lo que la
hace la versión completa del feed de seguidos:

- **Las personas están escondidas** en un desplegable de nombres sin avatar, cuando en un feed social son la entrada
  principal.
- **El tipo es un select** de nueve opciones, mientras `/activity` ya usa chips.
- **No se sabe qué es nuevo:** no hay forma de distinguir lo que pasó desde la última visita.
- **No hay salida a la comunidad** desde la cabecera.

## What Changes

- **Franja de personas** con avatar sobre el listado: "Todas" y cada seguido; elegir una filtra por esa persona
  (reemplaza el select). Un punto ámbar marca a quien tiene actividad nueva desde la última visita, y esas personas van
  primero.
- **Chips de tipo** como en `/activity` (componente compartido `FeedKindChips`), con los nueve tipos del feed.
- **"Toda la comunidad →"** en la cabecera, hacia `/activity`.
- **"Nuevo desde tu última visita":** el listado abre con un bloque propio para las entradas posteriores a la última
  visita, antes de los bloques de fecha. La marca vive en `app_user.feed_seen_at` (migración `0078`) y se mueve al abrir
  la página con `PUT /api/me/feed/seen`; la primera visita no marca nada como nuevo.

### Non-Goals

- Fusión por persona, disco y día y riel lateral (Fase 3).
- Contar entradas nuevas o mostrar un contador en la navegación.

## Capabilities

### Modified Capabilities

- `activity-feed`: la página completa del feed gana la franja de personas, los chips de tipo, el enlace a la comunidad
  y el bloque de novedades desde la última visita.

## Impact

- `drizzle/0078_feed_seen_at.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- `src/services/feed/feed.ts` (`listFeedAuthors` con avatar, `getFeedSeenAt`, `markFeedSeen`,
  `listAuthorsWithNewActivity`), `src/app/api/me/feed/seen/route.ts`, `docs/04-api/contracts.md`.
- `src/app/[locale]/me/feed/page.tsx`, `src/components/feed/` (`FeedPeopleStrip`, `FeedKindChips`, `FeedList`,
  `FeedActivityList`, `feed-date-sections`), `src/components/activity/CommunityActivitySection.tsx`.
- `messages/{es,en}/feed.json`, `docs/05-features/activity-feed.md`.
