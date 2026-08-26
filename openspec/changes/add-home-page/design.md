## Context

`src/app/[locale]/page.tsx` hoy es un Server Component sin sesión: tagline + `SearchForm`,
igual para cualquier visitante. El diseño de contenido de Inicio ya está cerrado en
`docs/05-features/home.md` (discusión de producto 2026-08-26); este documento resuelve
cómo implementarlo sobre la arquitectura existente.

Piezas reutilizables ya implementadas que este cambio aprovecha:
- `listFeed` (`src/services/feed/feed.ts`): feed de seguidos, ya devuelve `FeedEntry[]`
  (union de `listen`/`favorite`/`list`/`rating`/`comment`) con paginación.
- `FeedList`/`FeedBody` (`src/components/feed/FeedList.tsx`): render por tipo de entrada,
  hoy acoplado a la vista paginada completa de `/me/feed`.
- `listFollowing` (`src/services/social/following.ts`): para saber si el usuario sigue a
  alguien.
- `getCurrentUser` (`src/services/auth/authorization.ts`): sesión opcional (`null` si no hay).

## Goals / Non-Goals

**Goals:**
- Implementar los cinco bloques de contenido acordados en `home.md`, diferenciando sesión.
- Reusar `listFeed` y el render de `FeedEntry` existente en vez de duplicar lógica de
  presentación por tipo de actividad.
- Mantener Inicio como Server Component (carga inicial sin JS), sin introducir estado de
  paginación cliente para los bloques nuevos.

**Non-Goals:**
- No se construye una página "Explorar" ni una vista completa de actividad comunitaria o de
  listas públicas — los bloques nuevos son previews de tamaño fijo sin "cargar más".
- No se agrega el concepto de lista editorial/oficial (depende de un sistema de roles
  pendiente, ver `home.md` → Pendiente).
- No se toca el contrato de `GET /api/me/feed` ni el de `listFeed`.
- No se agregan nuevas rutas HTTP: los bloques se resuelven server-side en el propio
  Server Component de la página.

## Decisions

### `FeedEntryBody` se extrae como componente propio

`FeedList.tsx` tiene hoy una función interna `FeedBody` que resuelve el render por `kind`
para las cinco variantes de `FeedEntry`. Los tres bloques nuevos de Inicio (feed compacto,
actividad de la comunidad, listas públicas) necesitan exactamente ese mismo render — todos
producen datos con la forma `FeedEntry` (ver siguiente decisión). En vez de duplicar el
switch por `kind` en un componente nuevo, se extrae a
`src/components/feed/FeedEntryBody.tsx`, exportado, y `FeedList` pasa a importarlo.
Alternativa descartada: copiar el render dentro de cada bloque de Inicio — hubiera
significado mantener la misma lógica de cinco variantes en dos o tres lugares.

### Los bloques nuevos devuelven `FeedEntry[]`, no un tipo propio

- `listCommunityActivity` devuelve `(FeedRating | FeedComment)[]` — mismos tipos ya
  definidos en `src/services/feed/feed.ts`, sin el filtro `inArray(userId, followedIds)`.
- `listPublicLists` devuelve `FeedListEvent[]` — mismo tipo, misma razón.

Esto permite renderizar los tres bloques con el mismo `FeedEntryBody`, y evita introducir
tipos paralelos casi idénticos a los que ya expone el feed. Los dos servicios nuevos viven
en `src/services/home/home.ts`, junto al tercero (`listCommunityFollowingPreview`, wrapper
fino sobre `listFeed` con `pageSize` chico) para que el Server Component de Inicio importe
un único módulo.

### Filtro de visibilidad para los bloques sin relación de seguimiento

`listCommunityActivity` y `listPublicLists` no tienen un `followedIds` que acote la
consulta (a diferencia de `listFeed`), así que necesitan su propio criterio de quién
aparece:

- **`appUser.profileVisibility = 'public'`** en el autor — un perfil privado no expone su
  actividad a un desconocido sin relación de seguimiento aprobada, ni siquiera contenido
  que en su propia página de catálogo se muestra sin restricción (rating/comment no tienen
  audiencia propia, recordar `add-ratings-comments-feed`). Es una regla más estricta que la
  vista de catálogo a propósito: ahí el contexto es "opiniones sobre este ítem", acá es
  "quién está activo en la plataforma", una forma de exposición distinta.
  `listPublicLists` ya filtra además por `audience = 'public'` en la lista misma (una lista
  `followers`-only de un perfil público no debe aparecer en un bloque visible para
  cualquiera, logueado o no).
- **Bloqueo:** si hay usuario logueado, se excluyen filas de autores con bloqueo en
  cualquier dirección respecto al viewer (mismo patrón `NOT EXISTS ... user_block` que ya
  usa `feed.ts`, duplicado localmente en el nuevo archivo — es la misma decisión de no
  extraer una abstracción compartida que ya rige en el código existente, tres líneas de SQL
  no ameritan un helper propio). Para un visitante anónimo no hay bloqueos que aplicar.

### Onboarding cuando no hay seguidos

El Server Component de Inicio llama `listFollowing(user.id, 1, 1)` (barato: una fila) para
decidir si el usuario sigue a alguien. Si `users.length === 0`, el bloque de feed compacto
se reemplaza por un componente de onboarding (CTA a `/users` y a explorar listas públicas)
en vez de invocar `listFeed` — evita una consulta innecesaria y evita mostrarle a un
usuario nuevo el empty state genérico pensado para `/me/feed`.

### Sin nuevas rutas HTTP

Los tres bloques se resuelven en el propio Server Component (`src/app/[locale]/page.tsx`)
llamando directamente a las funciones de servicio, igual que ya hacen `/me/feed` y
`/me/lists` para su carga inicial. No hay interacción cliente en Inicio (no hay "cargar
más" en ningún bloque), así que no hace falta exponer estas consultas como endpoints REST.

## Risks / Trade-offs

- **[Riesgo]** Con poca actividad real (plataforma nueva), "actividad de la comunidad" y
  "listas públicas recientes" pueden verse vacíos casi siempre. → **Mitigación:** cada
  bloque maneja su propio caso vacío ocultándose (no renderiza el bloque) en vez de mostrar
  un empty state — un bloque vacío en Inicio no es un error, es esperable en una comunidad
  chica.
- **[Trade-off]** `listCommunityActivity`/`listPublicLists` no tienen paginación ni test de
  carga — aceptable porque son previews de tamaño fijo (ver Non-Goals), no listados
  completos.
- **[Riesgo]** La regla "perfil privado no aparece en los bloques comunitarios" es más
  estricta que la vista de catálogo actual (que muestra rating/comment de cualquiera sin
  filtrar por perfil). → Ya documentado como decisión deliberada en `home.md`; se deja
  registrado acá para que no se lea como inconsistencia accidental al leer el código.
