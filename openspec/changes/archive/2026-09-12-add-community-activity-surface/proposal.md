## Why

Con `+ Registrar` en el Header, el bar general quedó en Buscador · Explorar · Listas ·
Registrar. La "actividad reciente de la comunidad" (ratings, comentarios) —el pilar de
"reseñas como contenido en sí mismo" que distingue al producto— sigue sin ruta propia: solo
existe como bloque de tamaño fijo en Inicio (`CommunityActivity`), sin reseñas de álbum, sin
paginación y sin entrada en la navegación. Es el mismo hueco que tenía el descubrimiento de
listas antes de `add-community-lists-surface`, y el mismo patrón lo resuelve.

## What Changes

- **Nueva superficie pública `/[locale]/activity`**, accesible con y sin sesión, enlazada
  desde la barra general del Header junto a Listas y Registrar.
- Sin sesión, la página muestra una única sección **Recientes**, sin pestañas (una sola
  fuente no necesita selector). Con sesión, se suman dos fuentes más y las tres pasan a
  mostrarse como **pestañas** (`ActivityTabs`) en vez de apiladas verticalmente —apiladas,
  la página se volvía demasiado vertical para llegar a la tercera (feedback tras la primera
  entrega de este cambio):
  1. **Recientes** — ratings vigentes, comentarios y **reseñas de álbum** de cualquier
     usuario con perfil público, en orden cronológico descendente, paginado. Excluye
     bloqueados cuando hay sesión. Sin recomendación algorítmica, sin señal de
     "popularidad" fabricada.
  2. **De la gente que seguís** — reusa tal cual `listFeed` (mismo servicio de
     `activity-feed` que ya alimenta `/me/feed`). **Solo con sesión**: oculta para
     anónimos.
  3. **Tu actividad** — reusa tal cual `listMyRecentActivity` (mismo servicio que alimenta
     "Tu rastro reciente" de Inicio). **Solo con sesión**.
  Cada pestaña pagina de forma independiente (`useInfiniteQuery`); si una no tiene
  contenido, muestra un mensaje corto en vez de desaparecer (con pestañas, ocultar una es
  más disruptivo que un panel vacío). La página entera solo cae al estado vacío global
  cuando ninguna fuente disponible tiene contenido.
- **Se generaliza `listCommunityActivity`** (hoy en `src/services/home/home.ts`, solo
  ratings+comentarios, sin paginar, usada solo por el preview de Inicio) para sumar
  reseñas y devolver `{ entries, page, pageSize, hasNext }`, siguiendo el mismo patrón de
  "fusión en memoria por fuente" que ya usa `listFeed`. El preview de Inicio
  (`AnonymousHome`, `AuthenticatedHome`) pasa a consumir la versión generalizada pidiendo
  una sola página chica — su composición visual no cambia.
- **Se generaliza `CompactActivityRow`/`CommunityActivity`** para aceptar también reseñas
  (`FeedReview`) y para paginar con "cargar más" en la superficie nueva (patrón
  `CommunityListSection` ya usado en `/lists`).
- **Fuera de alcance**: sección "Populares" o cualquier ranking por señal social (no existe
  today un sistema real de likes; el codebase ya marca el ranking de comentarios de Inicio
  como maqueta — no se replica ese patrón acá); curaduría editorial de actividad; filtros de
  búsqueda/tipo en `/activity` (si hacen falta, sprint posterior, mismo criterio que
  `/me/feed`); cualquier cambio al contrato de `/me/feed` o `activity-feed`.

## Capabilities

### New Capabilities

- `community-activity`: la superficie pública `/[locale]/activity` y sus tres fuentes
  (Recientes, De la gente que seguís, Tu actividad) mostradas como pestañas con sesión y
  como sección única sin sesión, su comportamiento con y sin sesión, y el acceso desde la
  barra general del Header.

### Modified Capabilities

- `cross-view-navigation`: la barra general del Header para el usuario autenticado (y su
  equivalente anónimo) gana un enlace "Actividad" junto a Listas y Registrar; el panel
  móvil lo incluye en el bloque de barra general.

## Impact

- **Servicios**: nuevo `src/services/activity/community-activity.ts` con
  `listCommunityActivity(viewerId, page, pageSize)` generalizado (ratings + comentarios +
  reseñas, fusión en memoria, paginado). Se retira la versión anterior de
  `src/services/home/home.ts`; `AnonymousHome`/`AuthenticatedHome` importan la nueva.
- **API**: nuevo `GET /api/activity/recent` (público, paginado); reuso de
  `GET /api/me/feed` para la sección de seguidos (sin cambios en su contrato).
- **Rutas**: nueva `src/app/[locale]/activity/page.tsx` con `resolveSession` (no
  `requirePageUser`).
- **Componentes**: `src/components/home/CommunityActivity.tsx` generaliza
  `CompactActivityRow` para `FeedReview` (reusa `t("reviewVerb")`/`reviewVerbTitled` ya
  existentes en el namespace `feed`); nuevo componente de sección paginada para
  `/activity` (patrón `CommunityListSection`, `useInfiniteQuery`).
- **Header**: `src/components/layout/Header.tsx` añade el enlace "Actividad" en la barra
  general `md+` y en el bloque general del panel móvil.
- **i18n**: nuevas claves de sección/vacío en el namespace `feed` o uno nuevo `activity`
  (a decidir en design.md).
- **Docs**: `docs/05-features/activity-feed.md` y/o `home.md` registran la nueva
  superficie y la generalización del servicio.
- **Sin** migración de base de datos ni cambios en el modelo de rating/comment/review.
