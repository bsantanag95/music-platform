## Context

Estado actual de la actividad comunitaria:

- **`listCommunityActivity(viewerId, limit = 10)`** (`src/services/home/home.ts`): ratings
  vigentes + comentarios públicos recientes de cualquier perfil `public`, sin requerir
  seguimiento. Dos queries independientes (`rating`, `comment`), cada una `ORDER BY ...
  LIMIT limit`, **sin fusionar ni paginar** — el caller (`AnonymousHome`,
  `AuthenticatedHome`) recibe hasta `limit` de cada tipo mezclados tal cual llegan. Excluye
  bloqueados vía `NOT_BLOCKED_SQL(viewerId, authorId)` cuando hay `viewerId`. **No incluye
  reseñas.**
- **`CommunityActivity`** (`src/components/home/CommunityActivity.tsx`): Server Component
  que renderiza `(FeedRating | FeedComment)[]` como filas compactas
  (`CompactActivityRow`) — carátula, autor, tipo (★N o "comentario"), fecha relativa,
  snippet del comentario. Sin acciones, sin paginación: pensado para un preview fijo.
- **`listFeed(viewerId, page, pageSize, filters?)`** (`src/services/feed/feed.ts`): el feed
  de seguidos completo (6 fuentes: listen, favorite, list, rating, comment, review),
  **fusión en memoria** — cada fuente se consulta con `LIMIT pageSize + 1` (sin offset por
  fuente), se concatenan, se ordenan por `createdAt` descendente, y se hace
  `.slice((page-1)*pageSize, page*pageSize+1)` sobre el conjunto fusionado;
  `hasNext = merged.length > pageSize`. Ya documentado como aproximación aceptada mientras
  no haya volumen real que la rompa. Ya alimenta `/me/feed` vía `GET /api/me/feed`
  (`requireUser`, 401 sin sesión) — **no se toca**.
- **`PRIMARY_ARTIST_SQL`** se exporta desde `feed.ts` y ya lo importa `home.ts` — resuelve
  el nombre de artista acreditado para álbum/canción sin duplicar la subquery.
- **Patrón `/lists`**: `list-discovery` (cronológico, generalizado a lector anónimo) +
  `community.ts` (Destacadas/Populares/De seguidos) + `CommunityListSection`
  (`useInfiniteQuery`, patrón ya probado) + entrada en el Header. Este cambio es el mismo
  molde aplicado a actividad, con una sección menos (sin "Populares": no hay señal social
  real que ordenar sin fabricarla).

## Goals / Non-Goals

**Goals:**

- Superficie pública `/[locale]/activity`, con y sin sesión, enlazada desde la barra
  general del Header.
- Sección "Recientes" con ratings + comentarios + **reseñas**, paginada de verdad
  (`page`/`pageSize`/`hasNext`), reemplazando la versión sin paginar de
  `listCommunityActivity`.
- Sección "De la gente que seguís" reusando `listFeed` sin modificarlo.
- El preview de Inicio sigue viéndose igual, solo cambia su fuente de datos (pide una
  página chica de la versión generalizada).
- `CompactActivityRow` generalizado para reseñas, reusado en Inicio y en `/activity`.

**Non-Goals:**

- Sección "Populares" o cualquier ranking por señal social — no existe un sistema de likes
  real; no se fabrica uno.
- Filtros de búsqueda/tipo/autor en `/activity` (si se necesitan, mismo criterio que
  `/me/feed`, sprint posterior).
- Curaduría editorial de actividad.
- Cambios al contrato de `activity-feed` (`GET /api/me/feed`, `listFeed`).
- Acciones desde la fila (dar like, responder) — sigue siendo una vitrina de lectura, igual
  que hoy en Inicio.

## Decisions

### 1. Nuevo módulo `src/services/activity/community-activity.ts`

Se extrae de `home.ts` en vez de ampliarlo in situ: `home.ts` ya es un archivo grande de
funciones específicas de Inicio, y esta función pasa a tener dos consumidores
independientes (Inicio y `/activity`) más un endpoint propio — mismo criterio que separar
`community.ts` de `discovery.ts` en listas. El módulo nuevo importa `PRIMARY_ARTIST_SQL`
desde `feed.ts` (ya exportado) y las tablas de `@/db/schema`; redefine localmente
`PUBLIC_PROFILE` / `NOT_BLOCKED_SQL` (dos líneas, no vale la pena compartirlas vía un
tercer módulo).

`listCommunityActivity(viewerId: string | null, page = 1, pageSize = 10)`:

- Tres queries (`rating`, `comment`, `review`) contra perfiles `public`, cada una
  `ORDER BY updatedAt/createdAt DESC LIMIT pageSize + 1`, sin offset por fuente — **mismo
  patrón de fusión en memoria que `listFeed`**, no paginación SQL nativa (la
  heterogeneidad de fuentes no lo permite sin una tabla de eventos; ver nota ya aceptada en
  `feed.ts`).
- Fusiona, ordena por fecha descendente, `.slice((page-1)*pageSize, page*pageSize+1)`.
- `hasNext = merged.length > pageSize`.
- Devuelve `{ entries: (FeedRating | FeedComment | FeedReview)[], page, pageSize, hasNext
  }`.

`home.ts` **retira** su copia de `listCommunityActivity`. `AnonymousHome` /
`AuthenticatedHome` importan la nueva desde `@/services/activity/community-activity` y
llaman `listCommunityActivity(viewerId, 1, previewLimit)`, usando solo `.entries` — su
composición visual no cambia (siguen sin reseñas mostradas si no hay `previewLimit`
suficiente, pero ahora pueden aparecer si hay alguna reciente: mejora, no regresión).

**Alternativa descartada:** ampliar `listCommunityActivity` in situ en `home.ts` y dejar
que `/activity` la importe desde ahí. Funciona, pero mezcla en un archivo "de Inicio" una
función que ahora es la base de una ruta pública independiente — peor localidad para quien
edite cualquiera de los dos consumidores.

### 2. `CompactActivityRow` generalizado

Se amplía su tipo de entrada a `FeedRating | FeedComment | FeedReview` y se añade una rama
para `review`: título (si existe, vía `t("reviewVerbTitled", { title })`, si no
`t("reviewVerb")`) + cuerpo con `line-clamp-2` (mismo tratamiento que el comentario). Las
claves `reviewVerb`/`reviewVerbTitled` ya existen en el namespace `feed` (las usa
`FeedActivityList`) — se reusan tal cual, sin duplicarlas.

`CommunityActivity` (Server Component, sin paginación) queda igual salvo el tipo ampliado —
sigue siendo el bloque de Inicio. Para `/activity` se añade un componente cliente nuevo
`CommunityActivitySection` (mismo patrón que `CommunityListSection`:
`useInfiniteQuery` + "cargar más"), que renderiza la misma lista de filas
(`CompactActivityRow` se exporta para reuso) más el botón de paginación.

### 3. Sección "De la gente que seguís": reuso directo de `listFeed`

`/activity` con sesión llama a `listFeed(viewerId, page, pageSize)` **sin filtros** —
mismos datos que `/me/feed` completo. No se crea una variante: es intencional que
"actividad de la gente que seguís" en la vitrina pública sea el mismo feed que la página de
gestión, para no mantener dos nociones de "tu feed". La sección usa el endpoint existente
`GET /api/me/feed` desde el cliente (mismo criterio de `CommunityListSection` con
`from-following` contra `/api/lists/from-following`).

**Alternativa descartada:** una vista reducida solo de reseñas/ratings de seguidos. Se
descarta por ahora — mezclaría dos nociones de "feed" y no lo pidió el alcance.

### 4. Endpoint público `GET /api/activity/recent`

Espejo de `GET /api/lists/discover`: `getCurrentUser()` (no `requireUser`), pasa
`user?.id ?? null` a `listCommunityActivity`. Público con y sin sesión, sin filtros en
esta iteración (`page`/`pageSize` únicamente).

### 5. i18n: `feed.community.*`

Mismo criterio que `lists.community.*` en `add-community-lists-surface`: un sub-objeto
`community` dentro del namespace `feed` ya existente (no un archivo `activity.json`
nuevo, que obligaría a registrarlo en `i18n-test-utils` y en el catálogo de namespaces).
Contiene: `pageTitle`, `heading`, `intro`, `recentHeading`, `followingHeading`,
`emptyTitle`, `emptyDescription`. Las etiquetas de fila (`reviewVerb`, `commentLabel`,
`ratingVerb`, `loadMore`, `loadError`) ya existen en la raíz de `feed` y se reusan.

### 6. Pestañas en vez de secciones apiladas, y tercera fuente "Tu actividad"

Tras la primera entrega (Recientes + De la gente que seguís apiladas), feedback directo:
con sesión la página se volvía demasiado vertical para llegar a la segunda sección, y
faltaba una fuente para la propia actividad del lector (paralela a "Tu rastro reciente" de
Inicio). Se resolvió con `ActivityTabs` (`src/components/activity/ActivityTabs.tsx`):
mismo patrón ARIA-tabs ya usado en `PopularCommentsTabs`/`ListsSection` (estado local,
flechas de teclado, `rounded border` con `border-amber` en la seleccionada), pero cada
panel es una `CommunityActivitySection` completa (con su propia paginación) en vez de una
lista simple.

- **Tercera fuente "Tu actividad"**: reusa `listMyRecentActivity` (el mismo servicio de
  `src/services/home/home.ts` que alimenta "Tu rastro reciente" de Inicio) sin filtros
  propios — mismo criterio que la decisión 3 para "De la gente que seguís" (no crear una
  tercera noción de "tu actividad").
- **Solo se monta la pestaña activa**: el caché de React Query hace que volver a una
  pestaña ya visitada no vuelva a pedir su página 1.
- **Panel vacío en vez de pestaña oculta**: a diferencia de la composición apilada
  original (que omitía una sección sin contenido), con pestañas ocultar una directamente
  sería más disruptivo que mostrar un mensaje corto — la pestaña sigue siendo una opción
  visible aunque hoy no tenga nada. La página entera solo cae al estado vacío global
  cuando **ninguna** fuente disponible tiene contenido.
- **Sin sesión, sin pestañas**: con una sola fuente disponible (Recientes), una barra de
  pestañas no aporta nada — se mantiene el render directo de la sección, sin cambios
  respecto de la primera entrega.
- `CommunityActivitySection` gana un prop `emptyMessage` (antes: `entries.length === 0`
  ⇒ no renderizar nada) para poder mostrar ese mensaje corto dentro de una pestaña sin
  tipo de registro nuevo ni componente adicional.

## Risks / Trade-offs

- **[Fusión en memoria sin offset por fuente, páginas altas]** → mismo límite ya aceptado
  en `listFeed`: con tres fuentes y `pageSize + 1` cada una, un pool de hasta ~31 ítems
  cubre con margen las primeras páginas; se degrada si una sola fuente domina el volumen a
  varias páginas de profundidad. No se resuelve acá (requeriría una tabla de eventos,
  fuera de alcance) — documentado igual que en `feed.ts`.
- **[Cambio de fuente del preview de Inicio]** → riesgo de regresión visual si el nuevo
  wrapper `{entries,...}` no se desestructura bien en los dos callers. Mitigado con tests
  de `AnonymousHome`/`AuthenticatedHome` que ya existen — se corren tras el cambio, sin
  reescribirlos salvo el mock del import.
- **["Actividad" sin filtros vs. `/me/feed` con filtros]** → asimetría deliberada de
  alcance (Non-Goals); no bloquea el MVP.
- **[Reseñas ahora visibles en el preview de Inicio]** → cambio de comportamiento menor
  (antes no aparecían nunca ahí). Aceptado: es más fiel a "actividad reciente" y no
  contradice ningún requisito de `home`.
