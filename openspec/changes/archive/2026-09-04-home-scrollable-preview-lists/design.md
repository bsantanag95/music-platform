## Context

"Tu feed" (`FeedPreview`) y "Tu rastro reciente" (`RecentSelfActivity`) son hoy Server
Components: el servidor resuelve un arreglo fijo de 5 entradas (`listFollowingFeedPreview`
/ `listMyRecentActivity`, ambos `limit = 5` sin paginación) y lo pasa directo a
`FeedActivityList`. No hay estado de carga ni interacción del lado cliente.

`/me/feed` ya resuelve un problema parecido con `listFeed` (fusión de 5 fuentes,
paginado por página) + `GET /api/me/feed` + `getFeed()` + un botón "Cargar más" en
`FeedList.tsx` (client component con `useState`, sin TanStack Query).

## Goals / Non-Goals

**Goals:**
- Subir la carga inicial de ambos bloques de Inicio a 10 entradas.
- Contener esa lista en una altura fija (no crece respecto al bloque actual de 5) con
  scroll interno, con estética propia (no la barra nativa sin estilizar).
- Cargar automáticamente la página siguiente al llegar al fondo del contenedor, con un
  spinner circular como feedback de carga.
- Dar paginación real a `listMyRecentActivity`, hoy inexistente.

**Non-Goals:**
- No se toca `/me/feed` ni `/me/diary` (mantienen su propio patrón de "Cargar más").
- No se persigue una altura pixel-perfecta idéntica a "5 filas de hoy": la altura de fila
  varía según el peso de la entrada (liviana vs. con prosa) y la variante (`feed` vs.
  `self`, ver [[redesign-feed]]). Se fija una altura de contenedor que aproxima esa medida
  para el caso típico, no un valor derivado algebraicamente de cada fila.
- No se cambia `FeedActivityList` ni su lógica de agrupación/peso de contenido.
- No se introduce una librería de virtualización (react-window, etc.): el volumen por
  bloque de Inicio es acotado (paginado de a 10), no lo justifica.

## Decisions

### 1. Paginación de `listMyRecentActivity` replica el patrón de `listFeed`

Incorpora `page`/`pageSize` con la misma técnica que `listFeed` (`src/services/feed/feed.ts`):
cada una de las 3 fuentes (listens/ratings/comments) se consulta con
`limit(pageSize + 1)` sin `OFFSET` real por fuente, se fusiona en memoria, se ordena por
`createdAt` desc y se recorta con `.slice((page-1)*pageSize, page*pageSize+1)`. Devuelve
`{ entries, page, pageSize, hasNext }`, igual que `listFeed`.

**Alternativa considerada**: cursor por `createdAt` (keyset pagination) en vez de página
fija. Es más robusto para páginas profundas, pero introduce una forma de paginar distinta
a la que ya usa `/me/feed`, duplicando conceptos en la misma UI (Inicio) sin necesidad —
el volumen esperado en un preview de Inicio (paginado de a 10, la mayoría de usuarios no
llega a la página 3) no justifica la complejidad extra. Se prioriza consistencia con el
patrón existente sobre precisión en cola larga; si el volumen real lo justifica, migrar
ambos (`listFeed` y `listMyRecentActivity`) junto, no por separado.

**BREAKING**: `listMyRecentActivity` cambia de `Promise<FeedEntry[]>` a
`Promise<{ entries, page, pageSize, hasNext }>`. Único call site:
`AuthenticatedHome.tsx`.

### 2. "Tu feed" reusa `GET /api/me/feed` en vez de un endpoint de preview propio

`listFollowingFeedPreview` es hoy un wrapper de una línea sobre `listFeed(userId, 1,
limit)`. Con paginación real, ese wrapper deja de aportar nada: `AuthenticatedHome`
pasa a llamar `listFeed(user.id, 1, 10)` directo para la página inicial (SSR), y el
cliente pagina contra el endpoint que ya existe, `GET /api/me/feed`, con el fetcher que
ya existe, `getFeed()` (`src/lib/api/diary.ts`). Se elimina `listFollowingFeedPreview`.

"Tu rastro reciente" sí necesita superficie nueva porque su fuente (actividad propia sin
filtro de audiencia) no tiene endpoint hoy: `GET /api/me/recent-activity` (nuevo, mismo
esqueleto que `route.ts` de `/api/me/feed`) + `getRecentActivity()` en un nuevo
`src/lib/api/home.ts` + `RecentActivityResponseSchema` en `schemas.ts` (mismo shape que
`FeedResponseSchema`, pero `entries` es la unión `listen | rating | comment`).

### 3. Un componente cliente compartido, `ScrollablePreviewList`

Ambos bloques comparten el mismo contenedor con scroll + carga incremental; solo cambia
la fuente de datos y la variante visual de `FeedActivityList`. Como Server → Client no
puede pasar funciones por props, el componente recibe un discriminante serializable
(`source: "feed" | "self"`) y resuelve internamente qué fetcher usar (`getFeed` o
`getRecentActivity`, mismo shape de retorno) — no recibe la función de fetch como prop.

Los componentes contenedores (`FeedPreview.tsx`, `RecentSelfActivity.tsx`) siguen siendo
Server Components: resuelven el título de sección y el link ("Ver diario"/`/me/feed`) con
`getTranslations` server-side como hoy, y delegan la lista interactiva a
`ScrollablePreviewList` pasándole solo la primera página ya resuelta (`initialEntries`,
`initialPage`, `initialHasNext`) como estado inicial de una `useInfiniteQuery` de
TanStack Query — sin loading spinner en el primer render, porque esos datos ya vinieron
del servidor.

### 4. Carga incremental por `IntersectionObserver` sobre un sentinel, no por evento `scroll`

Un `<div>` invisible al final de la lista, observado con `root` apuntando al contenedor
con scroll (no al viewport), dispara `fetchNextPage()` al entrar en vista. Evita cálculos
manuales de `scrollTop`/`scrollHeight` y es agnóstico a la altura real de cada fila
(relevante porque el peso de contenido varía la altura de fila, ver Non-Goals).
`FeedList.tsx` no tiene este patrón (usa un botón), así que es interacción nueva en el
proyecto — sin librería adicional: el navegador soporta `IntersectionObserver` sin
polyfill en el baseline del proyecto.

### 5. Altura fija por variante, con scrollbar temática vía CSS

`max-h-*` de Tailwind por variante (aproximando la altura actual de 5 filas: mayor para
`feed`, que trae celda de carátula/disco y layout más alto, menor para `self`, ya
comprimida tras el ritmo apretado, ver decisión previa de `redesign-feed`), sobre
`overflow-y-auto`. La barra de scroll se retoca con una clase utilitaria nueva en
`globals.css` (`scrollbar-width`/`scrollbar-color` para Firefox,
`::-webkit-scrollbar*` para Chromium/Safari) usando los tokens ya definidos
(`--color-ink-border` en reposo, `--color-amber` en hover — coherente con la Regla de
Rareza: ámbar solo aparece en interacción, no en reposo).

### 6. Spinner: marca CSS propia, no un ícono de librería

Un anillo con `border` parcial en `--color-amber` y `animation: spin`, igual en espíritu
al resto del lenguaje visual (nada de glifos unicode como sistema de iconos, per
craft-floor). `role="status"` + `aria-label` localizado, sin texto visible (coherente con
el resto de la superficie, de solo lectura y de bajo ruido).

## Risks / Trade-offs

- **Altura aproximada, no exacta** → Se verifica visualmente en el navegador contra datos
  representativos (mezcla de filas livianas y con prosa) durante la implementación, y se
  documenta el valor elegido en el código con un comentario explicando que es una
  aproximación, no un cálculo derivado.
- **Paginación por `limit` sin `OFFSET` por fuente puede saltear entradas en páginas
  profundas** (limitación heredada de `listFeed`, ver Decisión 1) → aceptable para un
  preview de Inicio; si se detecta en uso real, se migra junto con `listFeed`.
- **`IntersectionObserver` dentro de un contenedor con `overflow-y-auto` en vez del
  viewport** → cubierto en jsdom para tests: se mockea `IntersectionObserver` (jsdom no
  lo implementa) siguiendo el patrón ya usado para mocks de query/red en
  `LazyCoverImage.test.tsx`.
- **Breaking change de `listMyRecentActivity`** → alcance controlado: único call site en
  el repo (`AuthenticatedHome.tsx`), se actualiza en el mismo change.
