## Context

`src/app/[locale]/page.tsx` es un único Server Component que ramifica en `user ? … : …`.
La rama anónima ya está cerrada y documentada (`docs/05-features/home.md`, cambio
`redesign-frontend`): hero a sangre, muro de carátulas, `FeatureCarousel`, riel de
lanzamientos, comentarios populares, CTA. La rama con sesión nunca se rediseñó: hoy
renderiza un `<h1>{appName}</h1>` + `<p>{tagline}</p>` inline, luego `QuickLinks`, luego
`FeedPreview` o `OnboardingPrompt`, y después los mismos bloques de descubrimiento que el
anónimo pero en layout full-width.

Servicios disponibles y reutilizables:

- `listFollowing(userId, 1, 1)` — ya se usa en `page.tsx` para saber si el usuario sigue
  a alguien.
- `listFollowingFeedPreview(userId, limit)` — wrapper fino sobre `listFeed`.
- `listMyDiary(userId, page, pageSize)` — escuchas propias, orden descendente.
- `listMyLists(ownerId, page, pageSize)` — hoy ordena por `createdAt DESC`.
- Patrón de unión escuchas + ratings + comentarios: ya resuelto en
  `listCommunityActivity` (`src/services/home/home.ts`) y en `listFeed`
  (`src/services/feed/feed.ts`).
- Render por tipo de entrada: `FeedEntryCard` / `FeedEntryBody`
  (`src/components/feed/FeedEntryBody.tsx`), más `CoverThumb`, `formatFeedDate`,
  `targetHref`.

Restricciones del proyecto: Server Components para carga inicial, sin `fetch` desde
componentes, sin rutas HTTP nuevas si el dato se resuelve en el server, i18n vía
catálogos de mensajes, código y textos en español, `any` prohibido, typecheck + lint +
test + build en verde.

## Goals / Non-Goals

**Goals:**

- Definir la composición y jerarquía del Inicio con sesión: qué se quita del estado
  anónimo, qué bloques propios se agregan y en qué orden.
- Añadir dos fuentes de datos propias (`listMyRecentActivity`,
  `getMostRecentEditedList`) siguiendo el patrón de `listCommunityActivity` /
  `listPublicLists`: server-only, top-N fijo, sin paginación, sin endpoint HTTP.
- Mantener el archivo `page.tsx` legible pese a las dos ramas: extraer la composición
  con sesión a un subcomponente (`AuthenticatedHome`) para no engordar el componente
  raíz.
- Respetar la anti-feature "sin gamificación": el rastro reciente y el saludo son recap
  de presencia, nunca progreso ni pendientes.

**Non-Goals:**

- No se toca la rama anónima ni sus componentes (`AnonHero`, `HeroCoverWall`,
  `FeatureCarousel`, `AnonCta`).
- No se toca el contrato de `listFeed` ni de `/api/me/feed`.
- No se agrega "solicitudes de seguimiento pendientes" al Inicio (decisión del
  usuario: se gestionan en el Header y su propia página).
- No se agregan recomendaciones algorítmicas ni personalización más allá de "tu propia
  actividad" y "tus propias listas".
- No se aborda el mini-mosaico 2×2 de carátulas para listas públicas (pendiente L3
  separado en `home.md`).
- Sin cambios de esquema ni migraciones.

## Decisions

### 1. Extraer `AuthenticatedHome` como subcomponente Server

`page.tsx` pasa a decidir solo `user ? <AuthenticatedHome user={user} /> : <AnonymousHome />`
(o mantiene la rama anónima inline y extrae solo la de sesión). Toda la orquestación de
datos con sesión (`Promise.all` de feed preview, rastro reciente, lista reciente,
actividad de comunidad, listas públicas, comentarios populares, lanzamientos) vive en
`AuthenticatedHome`.

- **Por qué:** hoy `page.tsx` ya mezcla `previewLimit`, dedupe de carátulas del hero,
  `listFollowing`, y dos `Promise.all`. Sumar tres bloques más lo vuelve ilegible. El
  hero anónimo necesita `heroCovers`; la rama con sesión no — separar evita cargar
  `listRecentCoverArt` y el dedupe cuando hay sesión (ya se hace, pero disperso).
- **Alternativa descartada:** dejar todo en `page.tsx` con más variables locales.
  Rechazado por legibilidad y porque los tests de la rama con sesión quedan más
  claros apuntando a un componente con una responsabilidad.

### 2. `listMyRecentActivity(userId, limit)` — unión propia sin filtro de audiencia

Nueva función en `src/services/home/home.ts`. Tres consultas (escuchas, ratings,
comentarios) `WHERE user_id = $userId ORDER BY created_at DESC LIMIT $limit` cada una,
merge por fecha, `slice(0, limit)`. Devuelve el mismo tipo que consume `FeedEntryCard`
(`FeedListenEntry | FeedRating | FeedComment`) para reusar el render.

- **Por qué sin filtro de audiencia:** es el propio usuario mirando su propio rastro;
  ocultarle sus entradas privadas no tiene sentido y contradice `/me/diary`, que ya le
  muestra todo lo suyo.
- **Por qué no reusar `listMyDiary`:** `listMyDiary` es solo escuchas. El rastro
  reciente quiere las tres señales que son "contenido" (escucha = presencia, rating y
  comentario = opinión), igual que `listCommunityActivity` acota a ratings + comentarios
  pero acá sí se incluye la escucha porque es la señal de presencia del propio usuario.
- **Alternativa descartada:** derivar de `listFeed` filtrando por autor = usuario.
  `listFeed` está scopeado al grafo de seguidos con relación `accepted`; el usuario no
  se sigue a sí mismo. Además `listFeed` ya filtra audiencia.

### 3. `getMostRecentEditedList(userId)` — o `listMyLists` reordenado

Se necesita "la lista propia con actividad más reciente". `listMyLists` hoy ordena por
`createdAt DESC`. Opciones:

- **A (elegida):** nueva `getMostRecentEditedList(userId)` en `home.ts` que consulta
  `user_list WHERE owner_id = $userId ORDER BY updated_at DESC, id DESC LIMIT 1` y
  además trae hasta 4 `coverThumbUrl` de sus ítems (join a la entidad) para un
  mini-mosaico. Devuelve `null` si no hay listas.
- **B:** agregar un parámetro `orderBy` a `listMyLists`. Rechazado: ensancha un
  contrato compartido por `/me/lists` para un caso de Inicio; el mini-mosaico tampoco
  encaja en su tipo de retorno.

`updated_at` lo mantiene el trigger de DB (convención del proyecto), así que "editada
más recientemente" = `updated_at DESC` sin trabajo extra. Agregar un ítem a la lista
toca `user_list.updated_at` vía trigger — verificar en implementación; si no, ordenar
por el `MAX(created_at)` de `user_list_item`.

### 4. Saludo: `displayName` con fallback a `@username`, sin datos derivados

`<p>Hola, {user.displayName ?? "@" + user.username}</p>` resuelto por i18n
(`home.greeting` con placeholder). Una sola línea. Nada de "llevás N escuchas" ni
"desde el DD/MM": eso es métrica de progreso, fuera por anti-gamificación.

### 5. `OnboardingPrompt` ampliado, sigue siendo prosa

Se agrega una tercera acción: "registrá tu primera escucha" con link a `/search` (o a
la guía de cómo registrar). No se convierte en checklist con estados
completado/pendiente — eso sería un "backlog de pendientes", anti-feature declarada.
Tres enlaces en prosa/botones, sin tildes de progreso.

### 6. Layout de descubrimiento: se mantiene full-width con sesión

`CommunityActivity`, `PublicLists`, `PopularComments`, `HomeReleases` no cambian su
layout con sesión (ya son full-width / `previewLimit = 10`). Solo bajan en la página,
debajo de los bloques propios. El `compact` sigue siendo exclusivo del anónimo.

## Risks / Trade-offs

- **[El rastro reciente se parece demasiado a `/me/diary` y al feed]** → Se acota a
  top-N chico (p. ej. 5), sin acciones (no editar/borrar desde Inicio), con link "ver
  diario". Es un recordatorio de "por acá venías", no una vista de gestión.
- **[Percepción de gamificación]** → Revisar copy en review: nada de números de
  progreso, verbos de logro ni urgencia. El saludo y el rastro describen, no felicitan.
- **[`user_list.updated_at` podría no moverse al agregar ítems]** → Verificar el
  trigger en implementación; fallback a ordenar por actividad de `user_list_item`.
  Documentar el hallazgo en `home.md`.
- **[Tres consultas nuevas en el server para cada carga de Inicio con sesión]** → Van
  dentro del `Promise.all` existente, son `LIMIT` chico sobre índices por `user_id` /
  `owner_id`. Igual que `listCommunityActivity`. Sin materialización hasta que el
  volumen lo justifique (mismo criterio que el feed, `phase-5-design.md` §9).
- **[Regresión visual en el estado anónimo]** → El refactor extrae la rama con sesión;
  la anónima queda igual. Test de snapshot/estructura para `!user` sin cambios.

## Migration Plan

Cambio puramente de frontend + servicios de lectura. Deploy directo, sin migración de
datos. Rollback = revertir el commit; no hay estado persistido nuevo. Feature-flag
innecesario (la página ya ramifica por sesión y el estado anónimo no se toca).

## Open Questions

- ¿El bloque "retomá una lista" muestra solo la más reciente, o hasta 2–3 listas
  recientes en fila? El spec permite "una"; si en implementación una sola se ve pobre,
  ampliar a un top-3 es compatible con el requirement (ajustar el texto entonces).
- ¿El rastro reciente incluye favoritos? La decisión de producto en `home.md` excluyó
  favoritos de "actividad de la comunidad" por ser señal de baja carga de contenido;
  para el rastro propio podría incluirse como presencia. Propuesta: **no** en v1, por
  simetría con `listCommunityActivity` y para no inflar el bloque.
- ¿Se retira el `<h1>` con `appName` del todo, o queda como encabezado accesible oculto
  (`sr-only`) para la estructura del documento? Propuesta: `sr-only` para no perder el
  landmark `h1`.
