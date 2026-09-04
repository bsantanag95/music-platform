# Inicio — landing diferenciado por sesión

**Fase:** 5 (roadmap), navegación autenticada definida en `phase-5-design.md` §10.1.
**Estado:** ✅ Estructura de contenido implementada (`add-home-page`). Layout visual del
visitante anónimo rediseñado en `redesign-frontend` — ver "Hero visual del visitante
anónimo" más abajo. Estructura y jerarquía del Inicio **con sesión** cerradas en
`redesign-home-authenticated` — ver "Inicio con sesión — estructura" más abajo.

## Qué es

Hoy `/[locale]` (`src/app/[locale]/page.tsx`) es un landing genérico — tagline + buscador —
idéntico para cualquier visitante, logueado o no. Se ve como un buscador de catálogo (el
tipo de experiencia "fría" que `00-product/vision.md` señala como el problema de
RateYourMusic/Discogs), sin comunicar la propuesta social del producto ni distinguir a un
usuario con sesión activa.

Este documento cierra el diseño de una página de Inicio que sí diferencia contenido según
sesión, sin todavía definir su implementación.

## Estructura acordada

### Común a ambos estados

Esto es lo que le da peso a Inicio más allá de ser un buscador o un feed personal — ambos
bloques muestran contenido de **cualquier usuario público**, no solo de los seguidos:

- **Actividad reciente de la comunidad**: ratings y comentarios públicos recientes,
  ordenados por fecha. Acotado deliberadamente a estos dos tipos (no escuchas, favoritos ni
  eventos de lista) porque el pilar que justifica el bloque es "reseñas como contenido en sí
  mismo" (`00-product/product_philosophy.md` §4) — las otras fuentes son señales de
  presencia de bajo contenido, no opiniones.
- **Listas públicas recientes**: cualquier `user_list` con `audience = public`, ordenadas por
  actividad. **No** distinguen listas "oficiales/editoriales" — esa distinción depende de un
  sistema de roles/permisos para cuentas de la plataforma que `product_philosophy.md` §7 deja
  explícitamente sin resolver. Se agrega cuando ese sistema exista, sin cambiar el contrato
  de este bloque.

### Exclusivo de usuario logueado

- **Feed de seguidos, compacto**: preview corto (no la lista paginada completa) con link a
  `/me/feed`. Presente pero no protagonista único de la página — el resto de los bloques
  (actividad de la comunidad, listas públicas) le dan contenido a Inicio incluso para un
  usuario que sigue a poca gente.
- **Si el usuario no sigue a nadie todavía**: el espacio del feed compacto se reemplaza por
  un nudge de onboarding (buscar gente para seguir, explorar listas públicas) en vez del
  empty state genérico de `FeedList` ("Nada para ver todavía") — ese mensaje está bien para
  `/me/feed`, pero en Inicio de un usuario nuevo es la peor primera impresión posible.
- **Accesos rápidos**: diario, favoritos, listas, buscar.

Ver "Inicio con sesión — estructura" para la jerarquía completa y los bloques que agregó
`redesign-home-authenticated` (saludo, rastro reciente, retomar una lista).

### Exclusivo de visitante anónimo

- Tagline + propuesta de valor (ya existe).
- CTA a registro/login.
- **Búsqueda:** ya no hay buscador propio en Inicio. Nace con `add-header-search` como
  exclusivo del estado anónimo, pero `redesign-frontend` mueve `HeaderSearch` al Header en
  **todos** los estados, así que un buscador en el hero anónimo duplicaría la entrada y
  volvería a instalarlo como protagonista de Inicio — justo lo que este diseño evita. El
  visitante anónimo busca desde el Header, igual que un usuario con sesión.

## Notas técnicas de la implementación

- "Actividad reciente de la comunidad" y "listas públicas recientes" son fuentes de datos
  propias (`src/services/home/home.ts`: `listCommunityActivity`, `listPublicLists`), no un
  filtro sobre `listFeed` (`src/services/feed/feed.ts`): ese servicio está scopeado a
  usuarios seguidos con relación `accepted`. Filtran por `appUser.profileVisibility =
  'public'` en el autor (más `audience = 'public'` en el caso de listas) y, si hay sesión,
  excluyen bloqueos en cualquier dirección — sin paginación, devuelven un top-N fijo para
  preview.
- El feed de seguidos (`/me/feed`, `FeedPreview`, `RecentSelfActivity`) usa
  `FeedActivityList`; los bloques compactos (`CommunityActivity`, `PublicLists`) tienen su
  propia fila densa. `FeedEntryBody` se eliminó en `redesign-feed`; `targetHref` vive en
  `src/components/feed/feed-target.ts`.
- **"Tu feed" y "Tu rastro reciente" cargan y pagan con scroll interno**
  (`home-scrollable-preview-lists`): el servidor resuelve la primera página (10 entradas —
  `listFeed`/`listMyRecentActivity` con `pageSize=10`) dentro de un contenedor de altura
  fija (`ScrollablePreviewList`, cliente); el resto se pagina bajo demanda contra
  `GET /api/me/feed` / `GET /api/me/recent-activity` al llegar al fondo del contenedor
  (`IntersectionObserver` sobre un sentinel + `useInfiniteQuery`), con un spinner
  circular mientras carga. `listMyRecentActivity` ahora pagina igual que `listFeed`
  (`page`/`pageSize`/`hasNext`, ver `src/services/feed/feed.ts`); `listFollowingFeedPreview`
  se eliminó — "Tu feed" llama `listFeed` directo, igual que `/me/feed`.
- No hizo falta ningún rol/permiso nuevo — "listas públicas recientes" usa el mismo campo
  `audience` que ya expone `userList`.
- El hero ya no monta un `SearchForm` propio (lo hacía gateado a `!user` en
  `src/app/[locale]/page.tsx`). Con el rediseño, la única entrada de búsqueda es
  `HeaderSearch` en el Header, visible en todos los estados (ver
  `openspec/changes/add-header-search` para el origen del componente).
- La búsqueda de usuarios es una superficie separada en `/users`: no se mezcla con el
  buscador musical del Header. Inicio ofrece un acceso contextual a Usuarios tanto para
  visitantes como para usuarios autenticados, y el Footer conserva el enlace permanente.

## Inicio con sesión — estructura (`redesign-home-authenticated`)

El estado anónimo tuvo su rediseño visual en `redesign-frontend`; el estado con sesión
había quedado como un encabezado `appName` + `tagline` (texto para quien todavía no
entró) seguido de los mismos bloques de descubrimiento. Este cambio cierra su jerarquía.

### Qué se quitó

- Encabezado visible `appName` + `tagline` — queda solo un `<h1 class="sr-only">` para el
  landmark del documento.
- El hero visual (`AnonHero`, `HeroCoverWall`), el carrusel de funcionalidades
  (`FeatureCarousel`/`HowItWorks`) y el CTA de registro (`AnonCta`) son exclusivos del
  estado anónimo: `page.tsx` delega en `AnonymousHome` o `AuthenticatedHome` según sesión
  y ninguno de esos componentes se monta con sesión.

### Jerarquía (de arriba a abajo)

1. **Saludo** (`Greeting`): una línea `Hola, {displayName ?? @username}`. Sin conteos,
   fechas de alta ni rachas — recibimiento, no panel de progreso (anti-feature "sin
   gamificación").
2. **Accesos rápidos** (`QuickLinks`): diario, favoritos, listas, colección, buscador y
   usuarios. Se ubican justo debajo del saludo, antes del feed, para no quedar relegados
   tras el contenido de lectura. Conservan los seis enlaces.
3. **Feed de seguidos** (`FeedPreview`) como bloque principal, o **nudge de onboarding**
   (`OnboardingPrompt`) si no sigue a nadie. El nudge ahora también invita a registrar la
   primera escucha, en prosa (no un checklist con tildes). `FeedPreview` usa
   `FeedActivityList` (misma presentación que `/me/feed`, `redesign-feed`), con scroll
   interno y carga de a 10 (ver "Notas técnicas de la implementación").
4. **Tu rastro reciente** (`RecentSelfActivity`): las últimas escuchas, valoraciones y
   comentarios del propio usuario. **No filtra por audiencia** (es contenido propio,
   igual que `/me/diary`). Se oculta si no hay actividad. Fuente: `listMyRecentActivity`
   en `src/services/home/home.ts` (pagina de a 10). Presentación: `FeedActivityList` (peso
   por contenido, igual que `/me/feed` — ver `activity-feed.md`, `redesign-feed`), con el
   mismo contenedor de scroll y carga incremental que "Tu feed".
5. **Retomá una lista** (`ResumeList`): acceso directo a la lista propia con actividad más
   reciente, con mini-mosaico 2×2 de carátulas de sus ítems. Se oculta si el usuario no
   tiene listas. Fuente: `getMostRecentEditedList`.
6. **Descubrimiento**: `CommunityActivity` + `PublicLists` en el **mismo layout compacto
   que el anónimo** — grilla `lg:grid-cols-[1.5fr_1fr]` (apiladas en < `lg`) con `compact`
   y `previewLimit = 6`. Son bloques secundarios acá también (van debajo del contenido
   propio), así que ocupan poco alto. `PopularComments` y `HomeReleases` siguen full-width,
   más abajo. (Antes eran full-width con `previewLimit = 10`; el `compact` dejó de ser
   exclusivo del anónimo.)

### Nota técnica — "lista con actividad más reciente"

`user_list.updated_at` lo mantiene un trigger `BEFORE UPDATE ON user_list`
(`drizzle/0009_favorites_lists.sql`): **agregar o quitar ítems no lo toca** (esos writes
van a `user_list_item`). Por eso `getMostRecentEditedList` ordena por
`greatest(user_list.updated_at, coalesce(max(user_list_item.created_at), user_list.updated_at))`
— así "seguir armando una lista" (el caso más común) también cuenta como actividad.

### Decisiones descartadas

- **Aviso de solicitudes de seguimiento pendientes en Inicio**: se gestionan desde el
  Header y `/me/follow-requests`; Inicio no las toca.
- **Favoritos en el rastro reciente**: se excluyen en v1, por simetría con
  `listCommunityActivity` (los favoritos son señal de baja carga de contenido).

## Hero visual del visitante anónimo (`redesign-frontend`)

El rediseño reemplazó el hero plano (tagline + botones sueltos) por una primera impresión
visual, en la línea de Letterboxd/Musicboard, sin salir de "The Vinyl Listening Room":

- **Banda a sangre completa** (`AnonHero`, `src/components/home/AnonHero.tsx`): rompe el
  ancho de columna del `main` con `-mx-[calc(50vw-50%)] w-screen` (+ `overflow-x-clip` en el
  `main`), sin bordes ni esquinas.
- **Muro de carátulas** (`HeroCoverWall`, `src/components/home/HeroCoverWall.tsx`): cuadrícula
  de miniaturas reales, `opacity` baja, que se **difumina a transparente** hacia los bordes
  con una máscara alfa radial (`mask-image`) y un degradado `from-ink via-ink/55 to-ink` de
  legibilidad encima. Es decorativo: `aria-hidden`, `alt=""`.
- **Un solo CTA "Comenzá"** que abre `GetStartedModal`
  (`src/components/home/GetStartedModal.tsx`) con las dos rutas de entrada
  (`/auth/register`, `/auth/login`). No hay buscador en el hero — la búsqueda vive en el
  Header (`HeaderSearch`) para todos los estados.

### "Qué podés hacer" — carrusel de funcionalidades

Reemplaza la tira de 3 pasos ("Cómo funciona") por un carrusel horizontal con las 9
capacidades relevantes del producto: diario, rating dual, reseñas, favoritos, listas,
colección física, seguir, catálogo preciso, privacidad.

- `HowItWorks` (`src/components/home/HowItWorks.tsx`) sigue siendo el server component: sólo
  resuelve i18n (`feature{1..9}{Title,Body}`, `featuresTitle`, `featuresPrev/Next`) y delega
  en `FeatureCarousel`.
- `FeatureCarousel` (`src/components/home/FeatureCarousel.tsx`, **client**): `<ul>` con
  `overflow-x-auto` + `snap-x snap-mandatory`, tarjetas de ancho fijo (`w-64`, `shrink-0`) —
  **no bajan a una fila nueva**, siguen en horizontal. Flechas ‹ › (`scrollBy` de ~0.8 del
  ancho visible) que sólo aparecen si hay overflow y se deshabilitan en cada extremo; el
  contenedor también scrollea con trackpad/teclado (`tabIndex={0}`).
- **Sin animación de scroll** (`scrollBy` directo, sin `behavior: "smooth"`): el sistema de
  diseño evita el movimiento decorativo y el salto nítido entre grupos encaja mejor; además
  no hace falta un caso especial para `prefers-reduced-motion`.
- El estado de las flechas se refresca síncrono tras cada `step()` (no sólo por el evento
  `scroll`) + un `ResizeObserver` para el caso de resize.

### Actividad de la comunidad y listas públicas — layout

En **los dos estados** estos bloques son secundarios (prueba social en el anónimo, contenido
de descubrimiento debajo del contenido propio en el logueado), así que van en el mismo
layout denso: grilla `lg:grid-cols-[1.5fr_1fr]` (apilados en < `lg`) con `compact` y
`previewLimit = 6`. Lo arma cada componente de página (`AnonymousHome`, `AuthenticatedHome`),
no `page.tsx`.

- `CommunityActivity` renderiza `CompactActivityRow`: carátula 40px + una línea mono
  `@autor · ★N · fecha relativa` + título del target (display, `truncate`) + cuerpo del
  comentario con `line-clamp-2`. `<ul>` con `divide-y divide-ink-border`, sin tarjeta.
- `PublicLists` (`CompactListRow`): título de la lista (display) + `@autor · fecha
  relativa` (mono), `divide-y`, **sin `DiscPlaceholder`** (el disco por ítem no aportaba
  información).
- `redesign-feed` eliminó de estos dos la rama no usada que renderizaba `FeedEntryCard`
  full-width y el prop `withCover`/`compact`; siempre son densos. `FeedPreview` y
  `RecentSelfActivity` migraron a `FeedActivityList`. `FeedEntryBody` se eliminó;
  `targetHref` vive en `src/components/feed/feed-target.ts`.
- Primitiva `CoverThumb` (`src/components/catalog/CoverThumb.tsx`): miniatura cuadrada con
  `DiscPlaceholder` de fallback, tamaño vía `className`. Compartida por las filas compactas
  y `FeedActivityList`.
- **Futuro (L3, requiere backend):** mini-mosaico 2×2 de carátulas por lista (estilo
  playlist de Spotify / lista de Letterboxd). Necesita que `listPublicLists` devuelva ~4
  `coverThumbUrl` por lista. Sube el impacto visual del bloque de listas sin volver a la
  tarjeta full-width. Ver "Pendiente".

### "Comentarios populares" — apartado con control segmentado

Distinto de "Actividad de la comunidad" (cronológica, mezcla ratings + comentarios). Acá son
**solo comentarios, rankeados, con más contexto** (likes, autor, target, valoración), en un
**solo espacio con control segmentado** por tipo de entidad — no tres secciones apiladas.
Alinea con el pilar §4 de `product_philosophy.md` ("las reseñas son contenido en sí mismo").

**Estado:** diseño/layout implementado con **ranking y likes de maqueta**. La feature real
(likes en comentarios) es de un sprint futuro — ver abajo.

- `PopularComments` (server, resuelve i18n) → `PopularCommentsTabs`
  (`src/components/home/PopularCommentsTabs.tsx`, client). ARIA tabs: `role="tablist"` /
  `tab` / `tabpanel`, `aria-selected`, roving `tabIndex`, flechas ←/→ para cambiar.
- Pestañas `Artistas · Álbumes · Canciones` (`TAB_ORDER`). Se muestran las tres siempre;
  la activa arranca en la primera con contenido y una pestaña vacía cae en su empty state.
  Activa: `border-amber text-paper` (selección = ámbar, dentro de la Regla de Rareza).
- Fila: `CoverThumb` (disco en las pestañas de artista/canción — no hay foto/carátula),
  título del target (display, link) + `♡ N` en mono, `@autor · ★N` en mono, cuerpo con
  `line-clamp-3`. Ubicación: junto a "Actividad de la comunidad".
- **Servicio `listPopularComments()`** (`src/services/home/home.ts`): tres consultas (una por
  tipo), pool por `length(body) DESC` como proxy de "escritura sustancial", luego `likeCount`
  sintético estable (`mockLikeCount(id)`) que define el orden mostrado. La valoración es real
  (`rating` del autor sobre el mismo target, o `null`). Filtra por perfil público; **no**
  maneja bloqueos (la versión real sí, como `listCommunityActivity`).
- El seed (`scripts/seed-home.ts`) ahora genera comentarios de los tres tipos y a veces
  valora el mismo target — antes solo comentaba álbumes/canciones y la pestaña Artistas
  quedaba vacía. Requiere re-correr el seed para verlo poblado.

#### Feature real: "likes en comentarios" (sprint futuro)

Discutir cuando cambie el paradigma hacia **la relevancia de las interacciones**, donde los
comentarios/reseñas pasan a ser parte de la identidad de la página. Ese mismo spec decide
si se puede **comentar un comentario** (hilos: abrir debates, responder a comentarios
cómicos, etc.).

- **Schema:** tabla `comment_like (comment_id, user_id, PK/unique(comment_id, user_id))`. El
  conteo es `COUNT(*)`. **La identidad de quién likeó no se expone nunca** — ni al autor;
  es un registro contable, solo para deduplicar (un like por usuario). Alternativa: contador
  denormalizado `comment.like_count` + trigger.
- **Interacción:** botón de like en `Comments.tsx` + endpoint
  (`POST/DELETE /api/comments/[id]/like`) + estado optimista. **Requiere sesión** — no se
  likea anónimo. Sin audiencia en los likes.
- **Producto:** un ranking de "comentarios más populares" es una mecánica de popularidad
  agregada — hay que decidirlo contra la anti-feature "sin gamificación" y el posicionamiento
  "la subjetividad es el producto, no un score agregado tipo Metacritic". Es la decisión que
  destraba todo lo demás.
- **Borrado físico:** los comentarios se borran de verdad (ADR 0009) → los likes se van en
  cascada; un "top" cacheado tiene que tolerar ids que desaparecen.
- Al implementarse, `listPopularComments` cambia el `ORDER BY length(body)` + `mockLikeCount`
  por `ORDER BY like_count DESC` real; el resto del componente no cambia.

### Fuente de las carátulas del muro — hoy

`HeroCoverWall` es **agnóstico a la fuente**: recibe `covers: string[]` (URLs) y las cicla
sobre `TILE_COUNT` celdas con un paso coprimo (`(i * 7) % covers.length`) para que las
repeticiones no queden pegadas. Hoy `src/app/[locale]/page.tsx` arma ese array así:

- `listRecentCoverArt()` (`src/services/home/home.ts`): `release_group.cover_thumb_url`
  no nulo, `ORDER BY created_at DESC LIMIT 24`. Solo lee la miniatura pública de 250px, sin
  datos de usuario — no requiere sesión ni filtra por visibilidad.
- Unido (dedupe) con los `target.coverThumbUrl` de `listCommunityActivity`.

El valor de `release_group.cover_thumb_url` lo resuelve `findOrResolveCover()`
(`src/services/catalog/cover.ts`) con un `HEAD` a Cover Art Archive la primera vez que se
abre cada álbum (patrón cover-only, migración 0003). Es decir: el muro muestra las carátulas
que ya entraron a la base por uso real, más recientes primero.

### Fuente de las carátulas del muro — implementación futura (24 curadas a mano)

Pensado para cuando exista el **guardado definitivo de imágenes** (storage propio). No es
trabajo de ahora. Lo que habría que tocar:

1. **Fuente curada.** Encapsular la lógica de selección en una única función
   `getHeroCovers()` en `src/services/home/home.ts` (curadas primero; `listRecentCoverArt()`
   como fallback si están vacías; dedupe; cap en N) y que `page.tsx` solo llame a esa —
   hoy el armado está inline en `page.tsx`. Sobre esa función, elegir origen:
   - **Config estático**: `src/config/hero-covers.ts` con 24 URLs versionadas en git.
     Cambiarlas requiere deploy.
   - **Tabla editorial**: `hero_cover` (o `featured_media` genérica) con `image_url` +
     `position`. Solo si un admin debe curarlas sin deploy — **depende del sistema de
     roles/cuentas de plataforma que `product_philosophy.md` §7 deja sin resolver**, el
     mismo bloqueo que las listas oficiales. Si ese sistema se implementa, la tabla sale
     de ahí.
   - **Lista destacada**: sacar las carátulas de los items de una `user_list` marcada como
     editorial, cuando exista esa marca.
2. **Hosting + `next.config.mjs`.** Si el storage definitivo sirve desde S3/R2/CDN propio,
   agregar ese hostname a `images.remotePatterns` (hoy solo `coverartarchive.org` y
   `*.archive.org`). Si se guardan en `public/`, rutas locales sin cambio de config.
3. **`HeroCoverWall`.** Bajar `TILE_COUNT` a 24 (o múltiplo). Con 24 covers y 24 celdas,
   `(i * 7) % 24` es una permutación (7 y 24 coprimos) → cada carátula aparece exactamente
   una vez, barajada. Evaluar `priority` en las primeras imágenes por LCP.
4. **Tests.** `src/app/[locale]/page.test.tsx` mockea hoy `listRecentCoverArt`; pasaría a
   mockear `getHeroCovers` / la fuente curada.
5. **Licencia — el bloqueo que no es de código.** Si las 24 son carátulas de álbum, siguen
   siendo copyright de las disqueras: aplica la regla de `03-data/data-licensing.md` /
   `04-risks.md` #6 (miniatura ≤250px, uso de identificación, nunca full-res). El storage
   definitivo tiene que respetarla. Si en cambio son imágenes propias (arte comisionado,
   fotos, texturas de vinilo genéricas), no hay restricción de licencia y queda como puro
   tema de hosting + config.

## "Lanzamientos recientes" y "Próximos lanzamientos"

Dos apartados nuevos de Inicio: discos publicados hace poco (pasado) y discos anunciados
todavía sin salir (futuro). La distinción es limpia y no se solapa.

**Estado:** el **diseño/layout está implementado** con datos de maqueta (`redesign-frontend`).
El **pipeline de datos real es de un sprint futuro** (ver "Lo que falta analizar").

### Diseño: un solo riel en línea de tiempo

En vez de dos rieles de carátulas casi idénticos apilados, **un único riel horizontal
ordenado por fecha** con un marcador "hoy" en el medio:

```
‹ … ago 2026  │ HOY │  sep 2026 … ›
   [recientes]         [próximos]
```

- Scroll a la izquierda → lo que ya salió; a la derecha → lo que viene. Flechas ‹ ›
  (mismo patrón/estilo que `FeatureCarousel`), scrollbar nativa oculta.
- **Marcador "hoy":** una línea vertical fina + label en **VU Gold** — la única veta de
  ámbar del bloque, usada como una aguja de VU / cabezal de reproducción (dentro de la
  Regla de Rareza). Solo aparece si hay ítems de los dos lados.
- Tarjetas "próximas": carátula a `opacity-60` + fecha con prefijo (`Sale` / `Out`). Las
  "recientes", normales. Sin cuenta regresiva ni "no te lo pierdas" — la anti-feature
  "sin mecánicas de presión" sigue vigente.
- Carátula cuadrada con hairline `ink-border` (→ `amber` en `group-hover`, como
  `AlbumCard`) + título (display, `truncate`) + artista y fecha (mono `text-xs`).
- Ubicación: debajo de "Actividad de la comunidad" / "Listas públicas". El descubrimiento
  **social** es la identidad; el calendario es contenido editorial secundario. Se muestra
  en ambos estados (anónimo y con sesión).

### Datos: maqueta hoy, config manual como paso siguiente

**Hoy (`listHomeReleases()` en `src/services/home/home.ts`):** toma los release-groups con
carátula más recientes (`created_at DESC`, `credit role='primary'` para el artista, cap de
3 por artista para que el seed no muestre una sola discografía) y les asigna **fechas
sintéticas** repartidas alrededor de hoy (mitad pasado / mitad futuro, una por semana).
Sirve para revisar el layout con carátulas reales de catálogo. Está marcado como maqueta
en el propio docstring.

**Paso siguiente (sin backend nuevo), config manual:** reemplazar la asignación sintética
por `src/config/home-releases.ts` — `{ releaseGroupId, releaseDate, section: "recent" |
"upcoming" }[]` referenciando `release_group.id` **ya ingeridos**. Nunca título/artista/URL
a mano; la carátula sigue saliendo del pipeline `coverThumbUrl()` (≤250px, `04-risks.md`
#6). Mismo patrón que las 24 carátulas del hero.

**Componentes:** `HomeReleases` (server, resuelve i18n) → `ReleaseRail`
(`src/components/home/ReleaseRail.tsx`, client — riel + flechas + marcador). Tipo
`HomeRelease = { id, title, artist, coverThumbUrl, releaseDate, section }`. Cada tarjeta
linkea a `/album/{id}`.

### Lo que falta analizar (sprint real)

1. **Fecha de lanzamiento.** Hoy solo existe `release.release_date` (por edición, parcial —
   solo si se ingirió el tracklist de esa edición) y **no** a nivel `release_group`.
   MusicBrainz tiene `first-release-date` en el release-group; la ingesta no lo guarda →
   migración + cambio en `ingest-release.ts` + backfill.
2. **Release-groups sin tracklist / sin ediciones publicadas** (caso "próximos"): verificar
   que `ingest-release.ts` y la página `/album/[id]` no rompan con un release-group que no
   tiene ninguna `release` publicada.
3. **Estado "aún no salió":** se deriva (`release_date > hoy`), no se guarda flag — pero la
   UI de `/album/[id]` tiene que manejar "sin tracklist todavía".
4. **Carátulas pre-release:** Cover Art Archive a veces tiene arte de pre-venta, a veces no
   → muchos `DiscPlaceholder` en "próximos".
5. **Tensión con el Principio 4** ("el catálogo crece por uso real, nunca pre-cargado en
   masa"). Un calendario de lanzamientos es 100% pre-carga de cosas que nadie buscó. Es una
   decisión de identidad de producto: ¿"un Letterboxd para música" quiere un release
   calendar editorial? Hay que resolverlo antes de invertir en el sync.
6. **De dónde sale la lista.** MusicBrainz no tiene un feed de "upcoming" / "new releases"
   usable (consultar por rango de fechas devuelve el firehose global). Filtrar con calidad =
   curación editorial → engancha con el sistema de roles/cuentas de plataforma que
   `product_philosophy.md` §7 deja sin resolver (mismo bloqueo que las listas editoriales y
   las 24 carátulas del hero).
7. **Relevancia / localización:** ¿lanzamientos para quién? Sin personalización en fases
   tempranas (anti-feature declarada). Y la cadencia de refresco / quién cura.

## Pendiente

- Definir el rol/cuenta de plataforma que permita publicar listas editoriales
  (`product_philosophy.md` §7) — cuando se resuelva, este documento debe actualizarse para
  que "listas públicas recientes" distinga listas oficiales, y habilita la variante "tabla
  editorial" / "lista destacada" como fuente del muro de carátulas del hero.
- Muro de carátulas del hero anónimo con **24 carátulas curadas a mano**, cuando el guardado
  definitivo de imágenes esté implementado — ver "implementación futura" arriba.
- Listas públicas en Inicio anónimo con **mini-mosaico de carátulas** (L3) — requiere que
  `listPublicLists` devuelva ~4 `coverThumbUrl` por lista. Ver "Actividad de la comunidad y
  listas públicas — layout".
- Feature real **"likes en comentarios"** (destraba "Comentarios populares"): tabla
  `comment_like` anónima (nadie ve quién likeó, ni el autor), like con sesión obligatoria,
  y la decisión de producto sobre gamificación vs. el posicionamiento anti-agregado. El
  mismo spec define si se puede **comentar un comentario** (hilos). Se discute cuando el
  paradigma gire hacia "la relevancia de las interacciones". Ver "'Comentarios populares'".
- Apartados **"Lanzamientos recientes" / "Próximos lanzamientos"**: el riel (`ReleaseRail`)
  ya está en Inicio con **datos de maqueta** (fechas sintéticas sobre release-groups reales).
  Falta: (a) paso intermedio con `src/config/home-releases.ts` (curación manual sin backend),
  y (b) la versión real — resolver los 7 puntos de "Lo que falta analizar", empezando por la
  decisión de producto (Principio 4) y la fecha de lanzamiento en `release_group`. Ver
  "'Lanzamientos recientes' y 'Próximos lanzamientos'".
- Copy y diseño visual concreto de cada bloque (fuera del alcance de este documento, que
  cierra la estructura de contenido, no el layout).
