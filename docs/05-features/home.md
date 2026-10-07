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

- Tagline + propuesta de valor (ya existe), **reencuadrada hacia el álbum como obra** —
  valorarla, reseñarla, volver a ella; descubrimiento por personas, no por algoritmo (ver
  "Reencuadre album-forward del landing" más abajo).
- CTA a registro/login.
- **Bloque editorial de álbumes** debajo del hero (ver más abajo).
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
  buscador musical del Header. Inicio ofrece un acceso contextual a Usuarios para
  visitantes; con sesión, se llega eligiendo el tipo "Usuarios" en el buscador por ámbito, y el
  Footer conserva el enlace permanente para todos.

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
2. **Aviso de verificación de email** (`EmailVerificationNotice` con variante `home`):
   visible solo si el email del usuario no está verificado (`email_verified_at` nulo).
   Compacto, no bloqueante, con acción de reenvío. Desaparece cuando el email se verifica.
   Ver `docs/02-architecture/auth.md` sección 9.
3. **Accesos rápidos** (`QuickLinks`): diario, favoritos, listas, colección, recorridos
   (`/me/artist-journeys`) y caminos (`/me/caminos`) — todos de la biblioteca propia; la
   búsqueda ya vive en el Header. Se ubican junto al saludo, antes del feed, para no quedar
   relegados tras el contenido de lectura. Conservan seis enlaces.
4. **Feed de seguidos** (`FeedPreview`) como bloque principal, o **nudge de onboarding**
   (`OnboardingPrompt`) si no sigue a nadie. El nudge ahora también invita a registrar la
   primera escucha, en prosa (no un checklist con tildes). `FeedPreview` usa
   `FeedActivityList` (misma presentación que `/me/feed`, `redesign-feed`), con scroll
   interno y carga de a 10 (ver "Notas técnicas de la implementación").
5. **Tu rastro reciente** (`RecentSelfActivity`): las últimas escuchas, valoraciones y
   comentarios del propio usuario. **No filtra por audiencia** (es contenido propio,
   igual que `/me/diary`). Se oculta si no hay actividad. Fuente: `listMyRecentActivity`
   en `src/services/home/home.ts` (pagina de a 10). Presentación: `FeedActivityList` (peso
   por contenido, igual que `/me/feed` — ver `activity-feed.md`, `redesign-feed`), con el
   mismo contenedor de scroll y carga incremental que "Tu feed".
6. **Retoma una lista** (`ResumeList`): acceso directo a la lista propia con actividad más
   reciente, con mini-mosaico 2×2 de carátulas de sus ítems. Se oculta si el usuario no
   tiene listas. Fuente: `getMostRecentEditedList`.
7. **Descubrimiento**: `CommunityActivity` + `PublicLists` en el **mismo layout compacto
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
- **Muro de carátulas** (`HeroCoverWall`, `src/components/home/HeroCoverWall.tsx`): mosaico
  estático de 32 portadas fijas (ver "Fuente de las carátulas del muro"), `opacity` baja, que se **difumina a transparente** hacia los bordes
  con una máscara alfa radial (`mask-image`) y un degradado `from-ink via-ink/55 to-ink` de
  legibilidad encima. Es decorativo: `aria-hidden`, `alt=""`.
- **Un solo CTA "Comenzá"** que abre `GetStartedModal`
  (`src/components/home/GetStartedModal.tsx`) con las dos rutas de entrada
  (`/auth/register`, `/auth/login`). No hay buscador en el hero — la búsqueda vive en el
  Header (`HeaderSearch`) para todos los estados.

## Reencuadre album-forward del landing (`reframe-anon-landing-album-forward`)

La dirección `redefine-content-hierarchy` fija el álbum como unidad cultural central. El
landing anónimo lo refleja en dos piezas:

- **Copy del hero** (`heroLine1-3`, `anonSubtagline`): de "registrá / guardá favoritos /
  seguí" a *"El álbum es una obra · Valorala, reseñala, volvé a ella · Descubrí música por
  personas, no por un algoritmo"*. La `anonSubtagline` mantiene "registrar" (la capa de
  baja fricción sigue presente). Estructura del hero y CTA sin cambios.
- **Bloque editorial de álbumes** en `AnonymousHome`, **debajo del hero y encima de los
  bloques de la comunidad** — la obra primero, la prueba social después. Reutiliza
  `CollectionRail` y `AlbumRail` de `/explore` **verbatim**:
  - `CollectionRail` con `listFeaturedCollections()` — **solo si `isExploreEnabled()`**
    (con el flag apagado, sus listas enlazarían a rutas que redirigen a Inicio).
  - `AlbumRail` con `listTopRated()` ("Mejor valorados por la comunidad") — sin gate;
    `listTopRated` ya devuelve `[]` bajo el umbral de álbumes elegibles.
  - Cada riel colapsa por su cuenta; si ambos vienen vacíos, no se renderiza el contenedor.
- **El Inicio con sesión no cambia**: lidera con contenido propio; el bloque editorial es
  exclusivo del landing anónimo (test estructural en `AuthenticatedHome.test.tsx`).

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
  `@autor · ★ 86/100` (o `★ 4,5` sin puntaje detallado; `Reseñó`/`Comentó` con su glifo) y la
  fecha relativa alineada a la derecha + título del target (display, `truncate`) `· artista` +
  cuerpo del comentario o reseña con `line-clamp-2` y borde izquierdo (petróleo en la reseña).
  `<ul>` con `divide-y divide-ink-border`, sin tarjeta; el encabezado enlaza "Ver todo" a
  `/activity`.
- `PublicLists` (`CompactListRow`): mini-mosaico 2×2 de hasta 4 carátulas de la lista
  (`ListMosaic`, compartido con "Retoma una lista"; disco de respaldo si la lista no es de
  álbumes o aún no tiene carátulas) + título (display) + `Tipo · N ítems` + `@autor` con la
  fecha relativa a la derecha (mono), `divide-y`; el encabezado enlaza "Ver todas" a `/lists`.
  Solo listas `standard`: un Camino público tiene su propio descubrimiento (`/caminos`).
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
**solo comentarios, rankeados, con más contexto** (autor, target, valoración), en un
**solo espacio con control segmentado** por tipo de entidad — no tres secciones apiladas.
Alinea con el pilar §4 de `product_philosophy.md` ("las reseñas son contenido en sí mismo").

**Estado:** implementado con **likes reales** (cambio `add-comment-likes`, 2026-10-06). El
`♡ N` sintético que hubo antes (derivado del id) se retiró el mismo día; la feature real lo
reemplaza. Decisiones de producto —contra la anti-feature "sin gamificación" y "la subjetividad es
el producto"—: la cifra solo se muestra **desde 3 likes**, no se puede likear el propio comentario,
la cifra es igual para todos (autor incluido) y la identidad de quien likeó no se expone nunca.

- `PopularComments` (server, resuelve i18n) → `PopularCommentsTabs`
  (`src/components/home/PopularCommentsTabs.tsx`, client). ARIA tabs: `role="tablist"` /
  `tab` / `tabpanel`, `aria-selected`, roving `tabIndex`, flechas ←/→ para cambiar.
- Pestañas `Artistas · Álbumes · Canciones` (`TAB_ORDER`). Se muestran las tres siempre;
  la activa arranca en la primera con contenido y una pestaña vacía cae en su empty state.
  Control segmentado (una pieza `bg-ink-surface` con borde); la activa va rellena `bg-ink`
  con texto ámbar (selección = ámbar, dentro de la Regla de Rareza).
- Fila: `CoverThumb` 48px (disco en las pestañas de artista/canción — no hay foto/carátula),
  título del target (display, link), el comentario como cita con borde izquierdo en tono
  principal (`line-clamp-3`) y debajo la firma `— @autor · ★ 86/100` (o `★ 4,5` sin puntaje
  detallado) en mono.
- **Servicio `listPopularComments(perType, viewerId?)`** (`src/services/home/home.ts`): tres
  consultas (una por tipo) ordenadas por **likes reales** (`COUNT(*)` de `comment_like`, sin cuentas
  desactivadas), desempate por `length(body)` y luego por fecha. La fila lleva `likeCount`: `null`
  bajo el umbral (3), de modo que el conteo real solo ordena y nunca sale del servidor. Filtra por
  perfil público y cuenta activa, excluye comentarios ocultos por moderación y, con visitante, los
  de autores con bloqueo en cualquier dirección (como `listCommunityActivity`). La valoración es
  real (`rating` del autor sobre el mismo target, con su puntaje detallado, o `null`).
- **Pill `♡ N`** a la derecha del título (`aria-label` "N me gusta", clave
  `home.popularCommentsLikeWord`), solo con cifra visible.
- El seed (`scripts/seed-home.ts`) ahora genera comentarios de los tres tipos y a veces
  valora el mismo target — antes solo comentaba álbumes/canciones y la pestaña Artistas
  quedaba vacía. Requiere re-correr el seed para verlo poblado.

#### Likes en comentarios (implementado)

- **Schema:** `comment_like (comment_id, user_id)`, PK del par, `ON DELETE CASCADE` en ambos FK
  (migración `0062`; ver `docs/03-data/sql-model.md`). Conteo `COUNT(*)` sobre la PK, sin
  contador denormalizado (se puede agregar luego sin cambiar contratos).
- **Interacción:** `PUT/DELETE /api/catalog/comments/{commentId}/like` (idempotentes, con sesión;
  ver `docs/04-api/contracts.md`) y botón con estado optimista en `Comments.tsx`
  (`CommentLikeButton`). Anónimos y el autor ven la cifra sin botón.
- **Restricciones:** no se likea lo propio; dar like respeta bloqueos (`BLOCKED`) y suspensión social;
  quitarlo siempre se permite. Un comentario oculto por moderación cuenta como inexistente.
- **Borrado físico:** los comentarios se borran de verdad (ADR 0009) → los likes se van en cascada.
- **Fuera de alcance:** **comentar un comentario** (hilos), likes en reseñas y notificaciones de
  likes. Siguen pendientes de decisión.

### Fuente de las carátulas del muro — 32 fijas, un solo mosaico

El muro **no se resuelve en runtime**. Son 32 portadas elegidas a mano que dan identidad al
sitio, listadas en `HERO_COVERS` (`src/lib/config/hero-covers.ts`: `mbid`, `title`, `artist`,
en orden de lectura izquierda→derecha, arriba→abajo; el orden es parte del diseño).

- **Un solo archivo.** `npx tsx --env-file=.env scripts/build-hero-wall.ts` baja el
  `front-250` de cada una (`fetchCoverThumb`, misma fuente y tamaño que el espejo, ADR 0018),
  las recorta cuadradas (224px, bajo el tope de 250) y las compone en una cuadrícula 8×4 →
  `public/hero/wall.webp` (1792×896, versionado en git). Con `--placeholder` genera tonos
  neutros sin red ni BD.
- **Por qué mosaico y no 32 archivos.** Antes el hero hacía una consulta
  (`listRecentCoverArt`, que bloqueaba el SSR) y hasta 60 requests de imagen por
  `/_next/image`, cada una con la cadena CAA → archive.org en frío. Ahora: cero consultas, un
  request, una decodificación, caché inmutable de `public/`. `HeroCoverWall` es un `<img>`
  con `fetchPriority="high"` y `object-cover`; la máscara radial y el degradado de
  legibilidad no cambian. El recorte por `object-cover` hace que en móvil se vea el centro
  del mosaico.
- **Licencia, aplicada en código.** El mosaico es una copia almacenada de carátulas, así que
  rige la regla del espejo (ADR 0018): solo miniaturas ≤250px y retiro a pedido. El script
  **rechaza** cualquier release-group con `cover_blocked_at`, aborta si falta o falla una
  portada (nunca publica un mosaico a medias) y exige exactamente 32 MBID válidos y únicos.
  Atender un retiro = quitar la entrada de `HERO_COVERS` y volver a correr el script.
- `public/hero/` está excluido del matcher de `src/middleware.ts` (como `uploads`): sin eso el
  middleware de i18n redirige `/hero/wall.webp` a `/es/hero/wall.webp` y la imagen no carga.
- Cambiar el tamaño de la cuadrícula es tocar `HERO_WALL` (la comparten el script y el
  componente) y regenerar.

## "Lanzamientos recientes" y "Próximos lanzamientos"

Dos apartados nuevos de Inicio: discos publicados hace poco (pasado) y discos anunciados
todavía sin salir (futuro). La distinción es limpia y no se solapa.

**Estado:** implementado. El diseño/layout viene de `redesign-frontend`; los datos reales, de
`add-home-release-calendar` (calendario desde ListenBrainz, ADR 0029).

### Diseño: un solo riel en línea de tiempo

En vez de dos rieles de carátulas casi idénticos apilados, **un único riel horizontal
ordenado por fecha** con un marcador "hoy" en el medio:

```
‹ … 22 sept   29 sept  │ HOY │  Se lanza 13 oct   Se lanza 20 oct … ›
  ●──────────●─────────◉──────○─────────────○──────
     [recientes]                 [próximos]
```

- Scroll a la izquierda → lo que ya salió; a la derecha → lo que viene. Flechas ‹ ›
  redondas sobre los bordes (fondo translúcido con desenfoque), scrollbar nativa oculta.
  Al montar, el riel se posiciona con el marcador "hoy" a ~60 % del ancho (no arranca en
  el lanzamiento más viejo).
- **Pista de fechas:** una línea horizontal bajo las carátulas con un hito por tarjeta —
  relleno lo que ya salió, hueco lo que viene, y el hito del marcador en ámbar.
- **Marcador "hoy":** una línea vertical fina + label en **VU Gold** — la única veta de
  ámbar del bloque, usada como una aguja de VU / cabezal de reproducción (dentro de la
  Regla de Rareza). Solo aparece si hay ítems de los dos lados.
- Tarjetas "próximas": carátula a `opacity-60` (opaca al pasar el ratón), pastilla
  `Próximo` / `Upcoming` sobre la carátula y fecha con prefijo (`Se lanza` / `Out`). Las
  "recientes", normales. Fecha con día y mes (`12 sept`), con año solo si no es el actual. Sin cuenta regresiva ni "no te lo pierdas" — la anti-feature
  "sin mecánicas de presión" sigue vigente.
- Carátula cuadrada con anillo `ink-border` y sombra (→ `amber` en `group-hover`) + fecha
  (mono `text-xs`) + título (display, `truncate`) + artista (mono `text-xs`).
- Ubicación: debajo de "Actividad de la comunidad" / "Listas públicas". El descubrimiento
  **social** es la identidad; el calendario es contenido editorial secundario. Se muestra
  en ambos estados (anónimo y con sesión).

### Datos: calendario desde ListenBrainz (`add-home-release-calendar`, ADR 0029)

**Fuente.** El feed "Fresh Releases" de ListenBrainz (CC0, mismos MBID que MusicBrainz) da los
lanzamientos de los últimos 30 días y los próximos 90; `POST /1/popularity/artist` da los oyentes
de cada artista. MusicBrainz no tiene un feed usable y Spotify/Apple Music prohíben cachear y
mezclar sus datos. Todo sale de `src/services/listenbrainz/client.ts` (`LISTENBRAINZ_USER_AGENT`).

**Calendario aparte del catálogo.** La ventana filtrada (fecha exacta, Álbum o EP) vive en
`release_calendar_entry` y se reemplaza completa en cada sincronización. **Al catálogo solo entra lo
que se muestra**: la selección anónima y los discos de artistas con los que alguna persona tiene
relación se registran como stub de release-group con sus créditos. Esto resuelve la tensión con el
Principio 4 para este apartado (ver ADR 0029).

**Sincronización** (`src/services/home/release-calendar-sync.ts`): cada 24 h, bajo demanda —Inicio la
programa con `after()` si está vencida, sin bloquear la página— o forzada con
`scripts/sync-release-calendar.ts`. Una sola a la vez. Un fallo externo conserva el calendario
anterior. Pasos: feed → popularidad → selección → verificación en MusicBrainz de los finalistas (una
búsqueda `rgid:(…)` por lote de 50) → stub + carátula por el pipeline existente → reemplazo
transaccional. ~40 s con datos reales.

**Filtros de calidad.** Fecha exacta al día; Álbum o EP (sin sencillos); carátula conocida
(`caa_id` del feed y confirmada por Cover Art Archive); sin tipos secundarios (en vivo,
recopilatorio, banda sonora, remix…); y sin reediciones (fecha original anterior a la ventana). Lo
que MusicBrainz aún no indexó queda sin verificar y no se muestra hasta la próxima sincronización.

**Visitante anónimo** (`listHomeReleases`): hasta **12 recientes (30 días) y 12 próximos (60 días,
ampliable a 90 si hay menos de 4)**, ordenados por `log10(1 + oyentes)` más un impulso de hasta 2
puntos si el artista tiene actividad en la comunidad (seguidores, valoraciones, escuchas). Un disco por
artista en todo el riel y como máximo 3 por familia de géneros por lado (si el género del artista se
conoce). Se precalcula en la sincronización (`anonymous_rank`).

**Usuario con sesión** (`listPersonalHomeReleases`): lanzamientos de artistas con los que la persona
tiene relación —los sigue (peso 4), favorito o valoración ≥ 4 estrellas (3), escucha (2), colección o
"En tu búsqueda" (1)— de los últimos 30 días y los próximos hasta **180** (más allá de los 90 del feed,
desde `release_group.first_release_date` del catálogo). Hasta 20, por peso y cercanía a hoy. Un disco de
un artista **seguido** entra aunque no tenga carátula, con placeholder y la marca **"Anunciado"**. No se
rellena con la selección anónima: lo popular vive en su propia vista. No es la personalización algorítmica
que la anti-feature descarta: se basa solo en la relación explícita de la persona.

**Selector con sesión.** Con sesión el riel suma un control segmentado **"De tus artistas | Populares"**
(`ReleaseSwitcher`): dos vistas con orientación propia que nunca se mezclan, para que el riel no junte
géneros y artistas dispares. Abre en "De tus artistas" si tiene al menos 3 discos; si no, abre en "Populares"
y muestra una invitación bajo el riel — *"Sigue artistas, o valóralos y agrégalos a favoritos, y sus
lanzamientos aparecerán aquí"* — con un enlace a la búsqueda. Con la vista personal vacía y seleccionada se
muestra solo la invitación. Si "Populares" está vacía el selector se oculta; si ambas lo están, el apartado.
Sin sesión no hay selector.

**Componentes:** `HomeReleases` (server, resuelve i18n) → `ReleaseRail`
(`src/components/home/ReleaseRail.tsx`, client — riel + flechas + marcador). Tipo
`HomeRelease = { id, title, artist, coverThumbUrl, releaseDate, section, badge }` (`badge`: `"announced"` o nada). Cada tarjeta
linkea a `/album/{id}`.

**Disco que aún no salió:** la ficha de `/album/[id]` muestra "Se lanza el …"; sin pistas publicadas,
la pestaña Canciones muestra un estado vacío y, sin ninguna edición en MusicBrainz, la página muestra
título y fecha en vez del error "Sin ediciones disponibles".

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
- **Hilos** (comentar un comentario): el cambio `add-comment-likes` dejó fuera esa decisión. Se
  discute cuando el paradigma gire hacia "la relevancia de las interacciones".
- Copy y diseño visual concreto de cada bloque (fuera del alcance de este documento, que
  cierra la estructura de contenido, no el layout).
