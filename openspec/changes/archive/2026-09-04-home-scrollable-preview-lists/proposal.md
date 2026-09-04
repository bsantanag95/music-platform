## Why

"Tu feed" y "Tu rastro reciente" en Inicio muestran hoy un tope fijo de 5 entradas sin
forma de ver más sin salir del bloque (hay que ir a `/me/feed` o `/me/diary`). El usuario
quiere ver más resultados (10) sin que el bloque crezca en la página, desplazando el
contenido dentro de un contenedor con scroll propio, y cargando más entradas
automáticamente al llegar al fondo de ese contenedor.

## What Changes

- `listMyRecentActivity` (rastro propio) gana paginación por página, con la misma forma
  que `listFeed` (fusión de fuentes ordenada por fecha, `page`/`pageSize`/`hasNext`).
  **BREAKING**: cambia su tipo de retorno de `FeedEntry[]` a
  `{ entries, page, pageSize, hasNext }`.
- Nuevo endpoint `GET /api/me/recent-activity` (mismo contrato de paginación que
  `GET /api/me/feed`) para exponer esa paginación al cliente.
- `listFollowingFeedPreview` deja de tener una firma de "preview sin paginar": el bloque
  "Tu feed" pasa a paginar sobre `listFeed`/`GET /api/me/feed` (ya paginado) en vez de
  pedir un `limit` fijo.
- Ambos bloques de Inicio ("Tu feed" y "Tu rastro reciente") suben su carga inicial de 5 a
  10 entradas, dentro de un contenedor de altura fija (la altura visual actual de 5
  entradas) con scroll interno estilizado según la paleta del proyecto.
- Al llegar al fondo del contenedor con scroll se dispara carga incremental de la
  siguiente página (scroll infinito), con un spinner circular mientras resuelve.
- Nuevo componente `ScrollablePreviewList` (cliente, TanStack Query `useInfiniteQuery`)
  que envuelve `FeedActivityList` con el contenedor de scroll + carga incremental;
  reemplaza el uso directo de `FeedActivityList` en `FeedPreview` y `RecentSelfActivity`.

## Capabilities

### New Capabilities

(ninguna — el comportamiento se agrega a la capability existente `home`)

### Modified Capabilities

- `home`: el requirement "Rastro reciente del propio usuario en Inicio" deja de decir
  "SHALL NOT paginar"; se agrega un requirement nuevo sobre el contenedor con scroll y
  carga incremental, aplicable a los bloques "Tu feed" y "Tu rastro reciente".

## Impact

- `src/services/home/home.ts`: reescribe `listMyRecentActivity` con paginación tipo
  `listFeed`; `listFollowingFeedPreview` se simplifica o se remueve en favor de llamar
  `listFeed` directo desde la ruta API.
- `src/app/api/me/recent-activity/route.ts` (nuevo), reutilizando `parsePagination` y
  `requireUser` como `src/app/api/me/feed/route.ts`.
- `src/lib/api/schemas.ts`: nuevo `RecentActivityResponseSchema` (mismo shape que
  `FeedResponseSchema` pero con la unión de kinds `listen | rating | comment`).
- `src/lib/api/home.ts` (nuevo): fetcher cliente `getRecentActivity(page, pageSize)`,
  análogo a `getFeed` en `src/lib/api/diary.ts`.
- `src/components/home/ScrollablePreviewList.tsx` (nuevo): contenedor con scroll +
  `useInfiniteQuery` + spinner, usado por `FeedPreview.tsx` y `RecentSelfActivity.tsx`.
- `src/components/home/AuthenticatedHome.tsx`: dejar de pasar el arreglo de entradas ya
  resuelto en el servidor; pasar solo la primera página como estado inicial de la query.
- `src/lib/query/keys.ts`: nuevas query keys para feed preview y rastro reciente.
- Sin cambios en `FeedActivityList.tsx` ni en `/me/feed` (mantiene su propio botón
  "Cargar más").
