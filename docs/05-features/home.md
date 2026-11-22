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

- Tagline + propuesta de valor: **el diario de lo que escuchas y de lo que escuchan los demás**
  —registrar sin tener que opinar, valorar con estrellas o de 1 a 100 cuando se quiera,
  descubrimiento por personas, no por algoritmo— (`update-anon-hero-copy`, 2026-11-15; antes,
  "el álbum como obra", ver "Reencuadre album-forward del landing" más abajo).
- CTA a registro/login.
- **Bloque editorial de álbumes** debajo del hero (ver más abajo).
- **Búsqueda:** el hero anónimo vuelve a tener buscador (`redesign-anon-home-phase1`,
  2026-11-14). `redesign-frontend` lo había quitado para no duplicar el del Header ni
  convertir Inicio en "un buscador"; la auditoría de la portada mostró el problema contrario:
  buscar un artista es la tarea principal y, por debajo de `lg`, el buscador del Header
  quedaba escondido en el menú. Para no repetir la duplicación de entonces, el del hero **es
  el mismo componente** (`HeaderSearch size="hero"`): mismo selector de tipo, sugerencias y
  navegación a `/search`. Solo existe sin sesión; con sesión se busca desde el Header.

## Notas técnicas de la implementación

- "Actividad reciente de la comunidad" y "listas públicas recientes" son fuentes de datos
  propias (`src/services/home/home.ts`: `listCommunityActivity`, `listPublicLists`), no un
  filtro sobre `listFeed` (`src/services/feed/feed.ts`): ese servicio está scopeado a
  usuarios seguidos con relación `accepted`. Filtran por `appUser.profileVisibility =
  'public'` en el autor (más `audience = 'public'` en el caso de listas) y, si hay sesión,
  excluyen bloqueos en cualquier dirección — sin paginación, devuelven un top-N fijo para
  preview.
- El feed de seguidos de `/me/feed` usa `FeedActivityList`; en Inicio, «De quienes sigues»
  (`FeedPreview`) usa tarjetas (`ActivityCard`, ver más abajo); los bloques compactos (`CommunityActivity`, `PublicLists`) tienen su
  propia fila densa. `FeedEntryBody` se eliminó en `redesign-feed`; `targetHref` vive en
  `src/components/feed/feed-target.ts`.
- **Sin scroll interno** (`redesign-signed-in-home-phase2`, antes `home-scrollable-preview-lists`):
  «Tu feed» y «Tu rastro reciente» vivían en contenedores de altura fija con carga por
  `IntersectionObserver` (`ScrollablePreviewList`, eliminado), que atrapaban el gesto en el
  teléfono. Ahora «De quienes sigues» muestra un tramo fijo de tarjetas y «Ver más actividad»
  lleva a `/me/feed`; el rastro salió de Inicio (sigue en `/me/diary`, en el perfil y en la
  pestaña «Tú» de `/activity`, que usa `GET /api/me/recent-activity`).
- No hizo falta ningún rol/permiso nuevo — "listas públicas recientes" usa el mismo campo
  `audience` que ya expone `userList`.
- El hero sin sesión monta `HeaderSearch size="hero"` (variante `full`/`large` de
  `ScopedSearchField`), no un `SearchForm` propio. En el Header, por debajo de `lg` la
  búsqueda tiene su propio botón (`Abrir búsqueda`, 44 × 44 px) y se abre en una fila bajo la
  barra con el foco en el campo; el menú desplegable ya no la contiene. Menú y búsqueda se
  excluyen; Escape, el mismo botón o navegar la cierran (spec `header-search`).
- La búsqueda de usuarios es una superficie separada en `/users`: no se mezcla con el
  buscador musical del Header. Inicio ofrece a los visitantes un acceso contextual a Usuarios:
  la tarjeta "Conoce a quienes escuchan" (`PeopleCard`) al final de la columna lateral de la
  comunidad, visible aunque no haya actividad (`redesign-anon-home-phase2`; en la Fase 1 era un
  enlace en la cabecera de la actividad y antes un botón suelto entre secciones); con sesión, se llega eligiendo el tipo "Usuarios" en el buscador por ámbito, y el Footer
  conserva el enlace permanente para todos.
- "Listas públicas recientes" descarta las listas sin elementos en la propia consulta
  (`EXISTS` sobre `user_list_item`, antes del `limit`), así una lista vacía no ocupa lugar.

## Inicio con sesión — estructura (`redesign-home-authenticated`)

El estado anónimo tuvo su rediseño visual en `redesign-frontend`; el estado con sesión
había quedado como un encabezado `appName` + `tagline` (texto para quien todavía no
entró) seguido de los mismos bloques de descubrimiento. Este cambio cierra su jerarquía.

### Qué se quitó

- Encabezado visible `appName` + `tagline` — queda solo un `<h1 class="sr-only">` para el
  landmark del documento.
- El hero visual (`AnonHero`, hoy con `HeroCrate` y `HeroSampleEntry`), el carrusel de funcionalidades
  (`FeatureCarousel`/`HowItWorks`) y el CTA de registro (`AnonCta`) son exclusivos del
  estado anónimo: `page.tsx` delega en `AnonymousHome` o `AuthenticatedHome` según sesión
  y ninguno de esos componentes se monta con sesión.

### Jerarquía (de arriba a abajo)

1. **Cabecera** (`SignedInHero`, `redesign-signed-in-home-phase1`, ver "Cabecera del Inicio con
   sesión" más abajo): saludo como antetítulo, «¿Qué escuchaste hoy?» con el campo de registro,
   accesos rápidos en mosaicos y «Última vez»; para una cuenta sin actividad, la bienvenida. El
   **aviso de verificación de email** (`EmailVerificationNotice` con variante `inline`) es una
   línea dentro de la cabecera, visible solo si `email_verified_at` es nulo, no bloqueante y con
   acción de reenvío (ver `docs/02-architecture/auth.md` sección 9). Sin conteos, fechas de alta
   ni rachas — recibimiento, no panel de progreso (anti-feature "sin gamificación").
2. **Invitación de Tu año en discos** (`YearInvitationCard`), solo del 1 de diciembre al 15 de
   enero.
3. **Accesos rápidos** (`QuickLinks`, dentro de la cabecera): diario, favoritos, listas,
   colección física y progreso (`/me/progress`, que reúne recorridos de artista, Caminos y
   listas seguidas) — todos de la biblioteca propia; la búsqueda ya vive en el Header. Son cinco
   enlaces (`clarify-user-menu-names`). La actividad de seguidos se titula «De quienes sigues».
4. **Lo último que escuchaste** (`RecentListensShelf`, `redesign-signed-in-home-phase2`): estante
   con los últimos objetivos **distintos** anotados como escucha (hasta 8; `listMyRecentListens`
   lee las 60 escuchas más recientes y deduplica por objetivo), cada uno con tu valoración en
   forma compacta o el contexto de la escucha, y la fecha. No filtra por audiencia (contenido
   propio). Rejilla de 8 desde `lg`, riel horizontal por debajo. Se oculta sin escuchas.
5. **De quienes sigues** (`FeedPreview`): `listFeed` con `pageSize = 30` y
   `selectHomeFeedCards` (`home-feed-cards.ts`) eligen hasta 7 tarjetas (`ActivityCard`, la
   primera ancha): escucha, valoración, reseña, comentario y favorito de álbum; las escuchas
   seguidas de una persona se unen en una tarjeta de racha (mosaico 2×2 y títulos). Los eventos
   de poco valor del mismo tramo (listas, listas para completar, colección, búsqueda,
   seguimientos, favoritos de canción o artista) van en una línea por persona («Luis armó 6
   listas para completar»). «Ver más actividad» lleva a `/me/feed`. **Sin seguidos**, ese lugar
   es «Lo que se escucha en la comunidad» (`CommunityActivity layout="cards"`, 7 entradas) con
   «Buscar gente para seguir», y la comunidad no se repite más abajo; `OnboardingPrompt` se
   eliminó.
6. **Retoma una lista** (`ResumeList`, `redesign-signed-in-home-phase3`): la lista propia **con
   elementos** y actividad más reciente (`getMostRecentEditedList` une con `user_list_item`, así que
   una lista vacía nunca se propone), con mini-mosaico 2×2, tipo y cantidad. Va como fila al pie de
   «Lo último que escuchaste» (`variant="row"`) o, si no hay escuchas, como sección propia. Se oculta
   sin listas con elementos.
7. **Mejor valorados** (`AlbumRail layout="scroll"` con ★ promedio, `top-rated.ts` compartido con la
   portada): **solo para una cuenta sin actividad** (la misma condición que la bienvenida de la
   cabecera), después de la comunidad que ocupa el lugar del feed.
8. **Lanzamientos** (`HomeReleases` → `ReleaseSwitcher`): el horario de la portada con el selector
   «De tus artistas | Populares» (ver "Lanzamientos" más abajo).
9. **Para seguir explorando** (`CollectionMosaic`): las colecciones curadas, solo con `/explore`
   habilitado.
10. **La comunidad**, como en la portada: con seguidos, `CommunityActivity layout="cards"` (7) en 2/3
    y `PopularComments`/`PublicLists variant="panel"` + `PeopleCard` en 1/3; sin seguidos (las
    tarjetas ya están arriba), solo los paneles en tres columnas. En Inicio la actividad de la
    comunidad **excluye la del propio lector** (`listCommunityActivity(..., { excludeViewer: true })`);
    `/activity` no cambia. Todo el cuerpo vive en el contenedor ancho: la columna de 768 px del
    Inicio con sesión desapareció.

### Cabecera del Inicio con sesión (`redesign-signed-in-home-phase1`)

Auditoría del 2026-11-17 (cuenta con uso y cuenta recién creada; mockups en
`mockups/home-signed-in-2026-11/`, composición elegida en `propuesta.html`): dirección **C ·
Continuidad** —el mismo sistema que la portada sin sesión— con el campo «¿Qué escuchaste hoy?» y
el estante «Lo último que escuchaste» de **B · Diario primero**, y la regla del feed de A (sin
scroll interno, eventos de poco valor agrupados). Tres fases:

| Fase | Alcance |
| --- | --- |
| 1 (`redesign-signed-in-home-phase1`) | La cabecera, descrita aquí. |
| 2 (`redesign-signed-in-home-phase2`) | Cuerpo en el contenedor ancho: estante «Lo último que escuchaste» (solo escuchas, reemplaza «Tu rastro reciente») antes de «De quienes sigues» en tarjetas, sin scroll interno, con «Ver más actividad» y los eventos de poco valor agrupados por autor. |
| 3 (`redesign-signed-in-home-phase3`) | «Retoma una lista» (solo listas con elementos) al pie del estante; lanzamientos como horario con selector; colecciones en mosaico; «Mejor valorados» para la cuenta sin actividad; la comunidad como en la portada, sin la actividad propia. |

- **Franja a sangre completa** con un mosaico de fondo (12 %, máscara hacia la derecha,
  `aria-hidden`) y el contenedor de `max-w-[88rem]`; dos columnas desde `lg`.
- **Fondo con tus álbumes** (`HeroBackdrop`, `personalize-signed-in-hero-backdrop`):
  `listMyBackdropAlbums` toma primero los favoritos de álbum con carátula (recientes primero) y,
  si faltan, los álbumes más escuchados por cantidad (no los recientes: ya están en el estante),
  hasta 20. Con al menos 6 (`BACKDROP_MIN`), una rejilla 8 × 4 con la geometría de `HERO_WALL`
  pone esas carátulas en las celdas visibles (columnas 3–7, desde la derecha) y rellena el resto
  con recortes de `wall.webp`; con menos, el mosaico general entero (una imagen, sin peticiones
  extra). Las propias van con `AppImage` sin prioridad y carga diferida. Por debajo de `lg` la
  máscara empieza en el 55 % y la opacidad baja al 9 %, para no competir con el titular. El `<h1>` es el
  titular visible «¿Qué escuchaste hoy?» (antes un `<h1 class="sr-only">` con el nombre de la app).
- **Campo de registro** (`HomeLogField`, cliente): combobox sobre `useTargetSearch` —la misma
  búsqueda en dos fases que el diálogo de «+ Añadir»— con selector Álbum | Canción. Elegir una
  sugerencia abre `QuickActionsDialog` en Escucha con `initialTarget`, que registra la escucha como
  desde el Header. No es un buscador del catálogo: `Enter` sin opción activa no navega.
- **«Última vez»** (`LastTouchCard`): la entrada más reciente del rastro propio con objetivo de
  catálogo (escucha, valoración, comentario o reseña), con carátula grande y tu valoración en forma
  de fila (de la propia entrada si es una valoración; si no, `getOwnRatingRow`). «Lo volví a
  escuchar» (`RelistenButton`) abre el diálogo con el objetivo y `confirmListen`: `ListenPanel`
  muestra «Registrar escucha» y no crea nada hasta confirmar.
- **Cuenta sin actividad** (sin esa entrada): «Te damos la bienvenida», una línea que explica el
  Inicio y dos enlaces en prosa —buscar gente y, si el onboarding está pendiente, completar el
  perfil musical— en lugar del antiguo `WelcomeLink` suelto; a la derecha, una cuadrícula decorativa
  de 8 carátulas del mosaico.

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

## Hero visual del visitante anónimo (`redesign-anon-home-phase1`)

`redesign-frontend` había reemplazado el hero plano por una banda a sangre completa con el muro
de carátulas difuminado detrás de un titular centrado y un solo CTA «Comienza» que abría
`GetStartedModal`. La auditoría de la portada (2026-11-14, dirección «C · Disquería», mockups en
`mockups/home-2026-11/`) lo rehízo en dos columnas, sin salir de "The Vinyl Listening Room":

- **Banda a sangre completa** (`AnonHero`): rompe el ancho del `main` con
  `-mx-[calc(50vw-50%)] w-screen` y vuelve a un contenedor propio de `max-w-[88rem]`. Dos
  columnas desde `lg`; en móvil se apila (texto arriba, caja debajo).
- **Columna de texto:** titular (`heroLine1` «El diario de todo lo que escuchas.» + `heroLine2`
  «Y de lo que escuchan los demás.» en ámbar; desde `update-anon-hero-copy`, antes «El álbum es
  una obra. / Tu historial, también.», que no decía qué es el sitio y cuya bajada empezaba por
  opinar), bajada (`anonSubtagline`: registrar sin opinar → valorar si se quiere → descubrir por
  personas) sobre fondo liso
  —ya no sobre las carátulas—, el buscador `HeaderSearch size="hero"`, los accesos «Prueba con …»
  (`HERO_SEARCH_EXAMPLES` en `src/lib/config/hero-covers.ts`, enlaces a
  `/search?type=artist&q=`) y las acciones **directas**: «Crear cuenta» → `/auth/register` y
  «¿Ya tienes una cuenta? Inicia sesión» → `/auth/login`. `GetStartedModal` se eliminó.
- **Caja de carátulas** (`HeroCrate`): las cuatro filas del mosaico fijo como carriles en un
  plano con perspectiva y máscara radial. Cada portada se recorta del mismo `wall.webp` con
  `background-position` (`heroWallTilePosition`): un solo archivo, que `AnonHero` precarga con
  `preload(..., { fetchPriority: "high" })` porque ya no es un `<img>`. Los carriles se deslizan
  muy despacio (`crate-drift`, 80–110 s por vuelta, solo `motion-safe:`); con movimiento
  reducido quedan quietos. Decorativa: `aria-hidden`. Reemplaza a `HeroCoverWall`, que se eliminó.
- **Entrada de ejemplo** (`HeroSampleEntry`, datos en `HERO_SAMPLE_ENTRY`): Loveless, 4,5
  estrellas (`StarRatingDisplay`), 92/100 (`ScoreBadge`, escala de la casa) y el contexto
  «Redescubrimiento», con el rótulo visible «Ejemplo». Fija, sin usuario real y sin enlace:
  enseña el doble puntaje en el primer viewport.

## Reencuadre album-forward del landing (`reframe-anon-landing-album-forward`)

La dirección `redefine-content-hierarchy` fija el álbum como unidad cultural central. El
landing anónimo lo refleja en dos piezas:

- **Copy del hero** (originalmente `heroLine1-3`, `anonSubtagline`; hoy `heroLine1-2`, ver «Hero visual del visitante anónimo»): de "registrá / guardá favoritos /
  seguí" a *"El álbum es una obra · Valorala, reseñala, volvé a ella · Descubrí música por
  personas, no por un algoritmo"*. La `anonSubtagline` mantiene "registrar" (la capa de
  baja fricción sigue presente). Estructura del hero y CTA sin cambios. *Histórico:* desde
  `update-anon-hero-copy` el hero ya no usa este encuadre (ver «Hero visual del visitante
  anónimo»); el bloque editorial de álbumes de abajo sigue vigente.
- **Bloque editorial de álbumes** en `AnonymousHome`, **debajo del hero y encima de los
  bloques de la comunidad** — la obra primero, la prueba social después. Desde
  `redesign-anon-home-phase2` (ver "Cuerpo de la portada sin sesión"):
  - `CollectionMosaic` (lo comparte la portada de Explorar desde `redesign-explore-phase2`, con sello de familia) con `listFeaturedCollections()` — **solo si
    `isExploreEnabled()`** (con el flag apagado, sus listas enlazarían a rutas que redirigen a
    Inicio).
  - `AlbumRail layout="scroll"` de `/explore` con `listTopRated()` ("Mejor valorados por la
    comunidad") — sin gate; `listTopRated` ya devuelve `[]` bajo el umbral de álbumes elegibles.
  - Cada riel colapsa por su cuenta; si ambos vienen vacíos, no se renderiza el contenedor.
- **El Inicio con sesión no cambia**: lidera con contenido propio; el bloque editorial es
  exclusivo del landing anónimo (test estructural en `AuthenticatedHome.test.tsx`).

### "Qué puedes hacer" — bloque de funcionalidades (`redesign-anon-home-phase3`)

Las 9 capacidades del producto (diario, rating dual, reseñas, favoritos, listas, colección
física, seguir, catálogo preciso, privacidad) se ven **todas a la vez**. Hasta
`redesign-anon-home-phase3` eran un carrusel (`FeatureCarousel`, eliminado) que a 1440 px
dejaba a la vista 3 de 9 y explicaba el doble puntaje solo con texto.

- `HowItWorks` (server) arma `feature{1..9}{Title,Body}` bajo `SectionHeading` (`src/components/ui/SectionHeading.tsx`, antes `HomeSectionHeading`)
  (`featuresTitle`, `featuresDescription`).
- **Tres paneles con demostración** (`DEMO_FEATURES = [1, 2, 6]`): diario (tres filas con
  carátulas del mosaico del hero y los contextos de escucha de `diary.context`), doble puntaje
  (`StarRatingValue` con `92/100`, forma de `rating-display`, y una barra 1–100 decorativa) y
  colección física (una copia con el formato y dos atributos de `collection.attribute`, el
  vocabulario cerrado real). Las demostraciones son `aria-hidden`, fijas, sin usuarios ni
  controles.
- **Las otras seis** (`LISTED_FEATURES`) van en una lista con icono SVG propio, título y una
  línea.

### Cuerpo de la portada sin sesión (`redesign-anon-home-phase2`)

Fase 2 de la dirección «C · Disquería» (plan en el `design.md` de
`2026-11-15-redesign-anon-home-phase1`). Solo la portada sin sesión: `/explore` y el Inicio con
sesión no cambian.

- **Contenedor ancho:** el cuerpo usa el mismo `max-w-[88rem]` del hero, con `gap-16 lg:gap-24`
  entre secciones. Cada sección lleva `SectionHeading` (`src/components/ui/SectionHeading.tsx`, antes `HomeSectionHeading`) (`h2` de 32–40 px, descripción de una
  línea y enlace «Ver …»), propio de Inicio porque `SectionHeader` lo comparte `/explore`.
- **Colecciones:** `CollectionMosaic` muestra hasta 6 (`mosaicTiles`): con 6 o más, destacada 2×2
  (cuadrícula 4×2 de carátulas) + cuatro medianas (`SleeveStack`) + la sexta a lo ancho; con 5,
  destacada + cuatro; con 4 o menos, todas medianas en una fila. Por debajo de `lg` las mismas
  fichas forman una fila con desplazamiento horizontal (`snap-x`), en vez de apilarse. Enlace a
  `/explore/collections`.
- **Mejor valorados:** `AlbumRail layout="scroll" headerless` con `albumArtistNames()` y
  `★ <promedio de estrellas>` sobre la carátula, como en `/explore`. El mockup mostraba un puntaje
  1–100, pero el ranking se calcula con el promedio de estrellas y no hay un promedio del puntaje
  detallado.
- **Comunidad en dos columnas** (`2fr 1fr` desde `lg`): `CommunityActivity layout="cards"` con
  `ActivityCard` (carátula, autor, nota compacta `★ 86/100` o `★ 4,5` según `rating-display`,
  extracto de 2–3 líneas en comentarios y reseñas; la primera tarjeta a lo ancho; 7 entradas para
  llenar tres filas de dos) y, al costado, `PopularComments variant="panel"`,
  `PublicLists variant="panel"` y `PeopleCard`. Sin actividad, la columna lateral ocupa el ancho.
- **Entrada de ejemplo del hero:** desde esta fase usa `StarRatingValue` (fila de estrellas +
  `92/100` en tono neutro) en lugar de `ScoreBadge`, que coloreaba el puntaje según su valor.
- Lanzamientos, «Qué puedes hacer» y el cierre pasan al contenedor ancho. Su rediseño interior
  es la Fase 3 (`redesign-anon-home-phase3`): horario de lanzamientos, bloque de funcionalidades
  (ver sus secciones) y **cierre en panel** (`AnonCta`): el mosaico de carátulas de fondo,
  atenuado y enmascarado; `anonClosingTitle`, `anonClosingBody` y dos acciones, «Crear cuenta» →
  `/auth/register` y, con el descubrimiento habilitado, «Explorar el catálogo» → `/explore`.

### Actividad de la comunidad y listas públicas — layout

En el Inicio **con sesión** estos bloques son contenido de descubrimiento debajo del contenido
propio, en layout denso: grilla `lg:grid-cols-[1.5fr_1fr]` (apilados en < `lg`) con
`previewLimit = 6`. La portada **sin sesión** los presenta como tarjetas y paneles desde
`redesign-anon-home-phase2` (ver la sección anterior). Lo arma cada componente de página
(`AnonymousHome`, `AuthenticatedHome`), no `page.tsx`.

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
  full-width y el prop `withCover`/`compact`; siempre son densos. `FeedPreview` migró a
  `FeedActivityList` y, en `redesign-signed-in-home-phase2`, a tarjetas. `FeedEntryBody` se eliminó;
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
- **Solo raíces** (`add-comment-replies`): las respuestas a un comentario de artista no entran en el ranking ni se
  muestran, aunque tengan más likes que cualquier raíz.
- **Tema** (`add-artist-comment-topics`): los comentarios de artista llevan su tema (`topic`:
  Para empezar · Álbumes · Canciones · General) como etiqueta junto al título del target; los de álbum y
  canción no. No cambia la selección ni el orden.
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
  request, una decodificación, caché inmutable de `public/`. Desde
  `redesign-anon-home-phase1` el mosaico ya no se muestra entero: `HeroCrate` y
  `HeroSampleEntry` recortan cada portada del mismo archivo con `background-position`, y
  `AnonHero` lo precarga con prioridad alta (antes lo hacía el `<img>` de `HeroCoverWall`).
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
todavía sin salir (futuro). La distinción es limpia y no se solapa. El recorrido completo de lo que viene
(180 días, cronológico, sin recortes por popularidad ni artista) vive en `/explore?proximos=1`
(ver `explore.md`); Inicio es el resumen.

**Estado:** implementado. El diseño/layout viene de `redesign-frontend`; los datos reales, de
`add-home-release-calendar` (calendario desde ListenBrainz, ADR 0029).

### Portada sin sesión: horario (`redesign-anon-home-phase3`)

Sin sesión, `HomeReleases layout="timetable"` presenta la selección anónima (la misma, con los
mismos filtros y topes) como `ReleaseTimetable` (en `components/discovery/` desde `redesign-explore-phase3`, que lo comparte con la sección Lanzamientos de Explorar): dos partes, «Recientes» (fecha descendente) y
«Próximos» (ascendente), lado a lado desde `lg`; cada fila es fecha corta (`formatReleaseDate`,
compartida con el riel en `release-dates.ts`), miniatura, título, artista y estado
(«Publicado» / «Próximo»), enlazada a `albumHref`. Seis filas por parte y el resto dentro de un
`<details>` nativo («Ver N más»). Una parte sin discos no se muestra. Préstamo de la propuesta A
de la auditoría: el riel ponía flechas sobre las carátulas y cortaba tarjetas en los bordes.

**Con sesión** (`redesign-signed-in-home-phase3`), el mismo horario lleva el selector «De tus
artistas | Populares» (`ReleaseSwitcher`, cliente, con sus textos por `useTranslations`): la lógica
de vistas no cambia (abre en lo personal con ≥ 3 discos, invitación a seguir artistas con menos,
«Populares» vacía oculta el selector). El riel de abajo (`ReleaseRail`) se eliminó.

### Diseño anterior: un solo riel en línea de tiempo (retirado en `redesign-signed-in-home-phase3`)

Histórico: en vez de dos rieles de carátulas casi idénticos apilados, **un único riel horizontal
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

Los discos de artistas **seguidos** se verifican y vinculan **antes** que el resto de la cola (tope de
150): el tope no debe dejar sin aviso justo a quien sigue al artista. Después del reemplazo, la
sincronización emite los avisos de lanzamiento de las notificaciones (openspec
`add-notification-milestones-and-releases`, ADR 0046) en una transacción propia: si fallan, el
calendario ya quedó actualizado y la próxima lo reintenta.

**Sencillos aparte.** Del mismo feed se toman los `Single` de artistas seguidos por alguien con el
aviso `artist_single` activado. Se verifican y vinculan dentro del mismo tope, pero **no** entran en
`release_calendar_entry` ni en el riel de Inicio: el calendario sigue siendo de Álbumes y EPs. Un
sencillo que nadie pidió no se verifica ni se vincula.

Al terminar, la sincronización marca para resincronizar las discografías guardadas a las que les falta
un disco del calendario (`artist.discography_refresh_requested_at`, openspec
`refresh-discography-on-new-releases`): la próxima visita a ese artista lo trae sin esperar los 7 días.
Es una sola sentencia sobre tablas propias, sin requests externas. Si falla, se registra y el calendario
igual queda sincronizado.

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
- **Hilos** (comentar un comentario): `add-comment-likes` dejó fuera esa decisión. Decidida solo para los
  comentarios **de artista** en `add-comment-replies` (ADR 0030): respuestas de un nivel, sin actividad propia en
  feed ni en «Comentarios populares» (que solo cuenta comentarios raíz). Álbum y Canción siguen sin respuestas;
  habilitarlas es una decisión de producto aparte.
- Copy y diseño visual concreto de cada bloque (fuera del alcance de este documento, que
  cierra la estructura de contenido, no el layout).
- **«Lo escuché» de un toque y discos de arranque para la cuenta nueva** (mockup B del Inicio con
  sesión): registrar sin abrir el diálogo exige decidir el contexto y la fecha por defecto y cómo
  deshacer. Fuera de `redesign-signed-in-home-phase1..3`.
- **Tipografías — implementación futura a analizar.** La dirección C proponía Bricolage
  Grotesque para titulares y Geist / Geist Mono para interfaz y datos. Las tres fases mantienen
  la tríada actual (Space Grotesk, Source Serif 4, IBM Plex Mono). Antes de decidir un cambio
  —que afectaría a toda la aplicación y necesitaría su propio ADR— hay que analizar: la
  legibilidad de Source Serif 4 en textos cortos de interfaz, el uso de IBM Plex Mono más allá
  de los datos, el coste de revisar todas las páginas ya rediseñadas, el peso de carga y el
  impacto en `DESIGN.md` y `docs/02-architecture/design-tokens-naming.md`.
