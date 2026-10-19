## Why

Varias secciones del menú de usuario tienen nombres que no dicen qué se puede hacer en ellas.
"Recorridos" y "Caminos" son evocadores pero opacos, y se parecen tanto que la única forma de
distinguirlos es entrar. "Colección" no aclara que se trata de la colección **física** (en una
plataforma digital puede confundirse con una colección que otorga el sitio). "Mis valoraciones" es
el único ítem con posesivo. Y "Feed" es un anglicismo, mientras que "Actividad" ya nombra otra
superficie (la pública, `/activity`), igual que "Listas" y "Caminos" aparecen dos veces: en la
barra general y en el menú.

## What Changes

- **Recorridos y Caminos se unifican en un solo destino, "Progreso"** (`/me/progress`). Las dos
  funciones responden a la misma pregunta (cuánto de un conjunto de discos ya escuché). Solo
  cambia de dónde sale el conjunto, y eso se elige al crear, no al navegar. El panel tiene tres
  pestañas: **Discografías** (los recorridos de artista), **Mis listas** (los Caminos propios) y
  **Listas que sigo** (las listas ajenas con seguimiento de progreso). Cada pestaña conserva el
  comportamiento actual de su listado (buscador, orden, filtro, modos de vista). `/me/artist-journeys`
  y `/me/caminos` redirigen a la pestaña correspondiente.
- **Vocabulario visible nuevo** (es y en). Los nombres internos de dominio, código, API y base de
  datos (`artist_journey`, `custom_journey`, `camino`) no cambian:
  - Recorrido → "discografía" en el contexto de progreso. La acción que lo crea pasa a ser
    **"Completar discografía"** (panel del artista, acción rápida, Pendientes).
  - Camino → **"lista para completar"** ("Nueva lista para completar", estante del perfil, feed).
  - "Mis valoraciones" → **"Valoraciones"**. "Mi perfil" → **"Perfil"**. En el menú ningún ítem
    lleva posesivo.
  - "Colección" → **"Colección física"** donde se nombra la sección (menú, título de la página,
    estante del perfil, accesos de Inicio).
  - "Feed" → **"Actividad"** en el menú, y "Actividad de quienes sigues" como título de `/me/feed`
    y de la vista previa de Inicio.
  - La superficie pública "Actividad" (`/activity`) → **"Comunidad"**.
- **El menú de usuario se agrupa con títulos de sección**: **Tu música** (Diario, Valoraciones,
  Favoritos, Pendientes, Colección física, Listas, Progreso) y **Social** (Actividad, Artistas
  seguidos, Seguidores, Seguidos, Solicitudes). El título del grupo hace de posesivo para todo el
  bloque, así que "Discografías" o "Listas" dentro del menú no se leen como superficies para
  explorar el catálogo.
- **La barra general queda en Explorar · Listas · Comunidad.** El enlace "Caminos" sale de la
  barra. El descubrimiento público (`/caminos`, renombrado visiblemente "Listas para completar")
  se alcanza desde una sección nueva de la vitrina de `/lists`.
- Inicio: los dos accesos rápidos "Recorridos" y "Caminos" se reemplazan por uno solo, "Progreso".

## Goals

- Que cada ítem del menú diga qué se puede hacer adentro, sin tener que entrar para averiguarlo.
- Que ningún nombre aparezca dos veces para dos superficies distintas (pública y personal).
- Un criterio único de posesivos: ninguno en los ítems, la pertenencia la dan los títulos de grupo.

## Non-Goals

- Renombrar rutas existentes, endpoints, tablas, tipos ni identificadores de código. Solo se agrega
  `/me/progress`. Las rutas de detalle (`/me/artist-journeys/[artistId]`, `/me/caminos/[id]`,
  `/users/[username]/caminos/...`) y `/caminos` se mantienen.
- Unificar los modelos de datos de recorrido y Camino, o mezclar sus entradas en un solo listado
  ordenable (la spec `camino` ya descartó mezclar orígenes con semánticas de estado distintas).
- Cambiar el comportamiento de los listados, del seguimiento de progreso o del feed.
- Rehacer `/activity` (sus pestañas internas se mantienen) o fusionar `/caminos` dentro de los
  filtros de `/lists`.

## Capabilities

### New Capabilities

- `progress-hub`: el panel unificado `/me/progress` con sus tres pestañas, la pestaña por defecto,
  las redirecciones desde `/me/artist-journeys` y `/me/caminos`, y el vocabulario visible de
  recorridos y Caminos (Completar discografía, lista para completar) en es y en.

### Modified Capabilities

- `cross-view-navigation`: barra general (Explorar, Listas, Comunidad; sin Caminos), menú agrupado
  con títulos "Tu música" y "Social", un único acceso "Progreso", etiquetas sin posesivo.
- `community-activity`: el enlace de la barra general hacia `/activity` se llama "Comunidad".
- `my-ratings-library`: el acceso del menú y del perfil propio se llama "Valoraciones".
- `artist-journey`: el listado propio vive en la pestaña Discografías de `/me/progress`, y el acceso
  del menú pasa a ser el de Progreso.
- `camino`: los Caminos propios y las listas que se siguen son pestañas de `/me/progress`, con un
  solo acceso de menú.
- `camino-discovery`: se alcanza desde la vitrina de `/lists` y no desde la barra general.
- `header-quick-actions`: los chips "Recorrido" y "Nuevo Camino" pasan a "Completar discografía" y
  "Nueva lista para completar".
- `artist-personal-panel`: la fila de recorrido se llama "Tu progreso" y su acción, "Completar
  discografía".

## Impact

- **Código**: `src/components/layout/user-menu-items.ts` (grupos con título, ítem `progress`),
  `UserMenu.tsx`, `Header.tsx`, página nueva `src/app/[locale]/me/progress/page.tsx`, redirecciones
  en `me/artist-journeys/page.tsx` y `me/caminos/page.tsx`, `CaminosSection`/`caminos-tabs` (pasan a
  ser las pestañas del hub), `components/home/QuickLinks.tsx`, `app/[locale]/lists/page.tsx`
  (sección Para completar), destinos de `router.push` en `ArtistJourneyManager` y `CaminoManager`,
  breadcrumbs de los detalles.
- **Mensajes**: `messages/{es,en}/common.json`, `artistJourney.json`, `camino.json`,
  `quickActions.json`, `catalog.json`, `feed.json`, `users.json`, `home.json`, `ratings.json`,
  `collection.json`, `wantToListen.json`, `errors.json`.
- **Tests**: `Header.test.tsx`, `OwnerProfileBar.test.tsx`, `QuickActionsDialog.test.tsx`,
  `me/caminos/page.test.tsx`, `lists/page.test.tsx` y los que afirman etiquetas literales.
- **Docs**: `docs/05-features/caminos.md`, `docs/00-product/product_philosophy.md` §6.4,
  `docs/05-features/activity-feed.md`, `docs/05-features/home.md` y el glosario o modelo de dominio
  si nombran estas secciones. Las rutas de API no cambian, así que `04-api/contracts.md` no se toca.
- Sin migraciones ni dependencias nuevas.
