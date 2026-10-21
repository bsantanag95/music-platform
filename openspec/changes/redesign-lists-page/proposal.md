## Why

`/{locale}/lists` acaba de pasar por cuatro pasadas de diseño (`polish-community-lists` y sucesoras), y la auditoría del
2026-10-20 (escritorio 1366px y móvil 375px, con y sin sesión, vitrina y modo explorar) confirma que la base está sana:
no hay desbordamientos, la búsqueda y los estados vacíos funcionan y cada lista sale una sola vez. Lo que falla es que las
carátulas, que son lo que vende una lista musical, se ven diminutas, que el control de orden no deja claro cuándo
cambia el modo de la página, y que hay errores concretos:

- En móvil, el título de la lista destacada se corta («Playlist d…», 102 de 147px) porque la marca «Oficial» comparte su
  línea.
- Las tarjetas de colecciones generadas enlazan a `/users/exploracion/lists/…`, que redirige a `/explore/collections/…`
  (un salto extra por clic), y muestran el título guardado en lugar del título del idioma.
- Cambiar solo el orden a «Populares» llena la grilla con siete colecciones generadas que la vitrina excluye a propósito.
- En la vitrina, el selector de orden dice «Recientes» como si ordenara toda la página.
- «Populares» significa dos cosas: la sección exige 2 o más guardados; el orden incluye listas con 0.
- En las tarjetas densas cada carátula del mosaico mide 23px; con tres carátulas, la primera se recorta a una franja
  vertical de 1:2 que se lee como un hueco.
- El botón Guardar mide 32×32px, por debajo de los 44px recomendados para tocar.
- La copia mezcla «por Fran» con «de besantanag95», y «1 siguiendo su progreso» se lee mal.
- Una sola destacada ocupa una tarjeta de ~660px con ~150px de contenido.

## What Changes

**Fase 1: correcciones**

- La marca «Oficial» pasa a su propia línea, sobre el título; el título nunca se trunca por ella.
- Las tarjetas de colecciones generadas enlazan directo a `/explore/collections/…` con el título del idioma: los resúmenes de
  `/api/lists/discover` y `/api/lists/popular` exponen `generated` (plantilla y período), como ya lo hacen las listas
  guardadas.
- Las colecciones generadas aparecen en el modo explorar solo con una búsqueda por texto (`q`); un cambio de orden o de
  tipo, sin texto, no las trae.
- El orden por guardados se llama «Más guardadas» («Most saved»); la sección «Populares» conserva su nombre y su umbral.
- El control de orden no muestra un valor en la vitrina; en el modo explorar, un rótulo dice qué se está viendo
  («12 listas · Más guardadas · Limpiar filtros»).
- Mosaico de tres imágenes: tres celdas iguales y una cuarta con «+N» (o el ícono del tipo), sin recortar ninguna carátula.
- Botón Guardar con un área táctil de 44px en móvil.
- Copia unificada: «por <nombre>» en todas las tarjetas y «N personas la están completando» en «Para completar».

**Fase 2: la lista como objeto visual**

- Las secciones de navegación (De la gente que sigues, Populares, Recientes, explorar) pasan a una **estantería**: mosaico
  cuadrado grande arriba y título y meta debajo, en una grilla de 2 columnas en móvil y hasta 5 en escritorio. Las
  imágenes de artistas van en círculo, como en el resto de la app.
- La destacada única se presenta como **portada ancha**: mosaico grande, una tira con las primeras imágenes y los
  primeros nombres de la lista, y Guardar visible.
- El filtro de tipo pasa de un select a **chips** (Todas · Álbumes · Artistas · Canciones), como en `/activity`; el orden
  queda como un control discreto junto al rótulo de resultados.

**Fase 3: contexto**

- Con sesión, un **riel lateral** desde 1024px (bloque tras las secciones por debajo) con «Tus listas»: la última lista
  que editaste para retomarla (el mismo criterio que «Retoma una lista» de Inicio) y el acceso a tus listas y guardadas.
- «Para completar» pasa a ese riel como módulo compacto (hasta 4, con «Ver todas»); sin sesión, el riel muestra solo
  «Para completar» y una invitación a crear una cuenta.
- Estado vacío global con acción («Crea la primera lista» con sesión; «Inicia sesión para crear la primera» sin ella).

## Capabilities

### New Capabilities

<!-- ninguna -->

### Modified Capabilities

- `community-lists`: la superficie suma el rótulo de explorar, el riel y el estado vacío con acción; Recientes y el modo
  explorar cambian cuándo aparecen las colecciones generadas y cómo se enlazan; el toolbar pasa a chips con «Más
  guardadas»; la regla del mosaico de tres imágenes y la tarjeta en estantería reemplazan las actuales.
- `camino-discovery`: «Para completar» deja de ser una sección de la vitrina y pasa al riel de `/lists`, con hasta 4.

## Goals

- Que las carátulas se reconozcan en cualquier tarjeta y que ningún mosaico parezca roto.
- Que cambiar el orden o el tipo nunca cambie qué clase de contenido aparece, y que se entienda en qué modo está la
  página.
- Que una colección de la plataforma siempre lleve a su página de Explorar, en un clic y con el título del idioma.
- Darle a quien tiene sesión un camino corto a sus propias listas desde la superficie pública.

## Non-Goals

- Cambiar las reglas de las secciones (umbral de Populares, orden de Destacadas, una lista por sección).
- Recomendación o personalización por afinidad: el riel solo muestra listas propias del lector y «Para completar», que ya
  es público.
- Rediseñar el detalle de una lista, `/me/lists` o `/caminos`.
- Migraciones de esquema.

## Impact

- **Código**: `src/app/[locale]/lists/page.tsx`, `src/components/lists/{CommunityListCard,CommunityListSection,
  CommunityListsToolbar,CommunityExploreGrid,ListCard,ListCoverMosaic,SaveListButton,lists-shared}.tsx`,
  `src/components/camino/CaminoDiscoveryGrid.tsx`, `src/services/lists/{discovery,community}.ts`,
  `messages/{es,en}/{lists,camino}.json`. Componente nuevo para el riel.
- **API**: `GET /api/lists/discover` y `GET /api/lists/popular` (y `from-following`) suman `generated` opcional en cada
  resumen (aditivo). `GET /api/lists/discover` deja de incluir colecciones generadas con `sort` o `entityType` sin `q`.
- **Esquema**: sin migraciones.
- **Docs**: `docs/04-api/contracts.md` (resumen de listas y regla de colecciones generadas), el documento de feature de
  listas en `docs/05-features/`.
