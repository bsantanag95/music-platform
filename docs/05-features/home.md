# Inicio — landing diferenciado por sesión

**Fase:** 5 (roadmap), navegación autenticada definida en `phase-5-design.md` §10.1.
**Estado:** ✅ Implementado (cambio `add-home-page`).

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

### Exclusivo de visitante anónimo

- Tagline + propuesta de valor (ya existe).
- Buscador (ya existe). **Ajuste (`add-header-search`):** ahora es exclusivo de este estado
  — un usuario con sesión ya tiene búsqueda persistente en el Header y el acceso rápido
  "buscar", así que mostrarlo también acá duplicaría la entrada y volvería a instalar el
  buscador como protagonista de Inicio, justo lo que este diseño evitó.
- CTA a registro/login.

## Notas técnicas de la implementación

- "Actividad reciente de la comunidad" y "listas públicas recientes" son fuentes de datos
  propias (`src/services/home/home.ts`: `listCommunityActivity`, `listPublicLists`), no un
  filtro sobre `listFeed` (`src/services/feed/feed.ts`): ese servicio está scopeado a
  usuarios seguidos con relación `accepted`. Filtran por `appUser.profileVisibility =
  'public'` en el autor (más `audience = 'public'` en el caso de listas) y, si hay sesión,
  excluyen bloqueos en cualquier dirección — sin paginación, devuelven un top-N fijo para
  preview.
- El feed compacto de Inicio (`listFollowingFeedPreview`) es un wrapper fino sobre
  `listFeed` con `pageSize` chico — mismo contrato que `/me/feed`.
- El render por tipo de actividad se comparte entre `/me/feed` y los tres bloques de Inicio
  vía `FeedEntryCard`/`FeedEntryBody` (`src/components/feed/FeedEntryBody.tsx`).
- No hizo falta ningún rol/permiso nuevo — "listas públicas recientes" usa el mismo campo
  `audience` que ya expone `userList`.
- El `SearchForm` del hero (`src/app/[locale]/page.tsx`) está gateado a `!user`, en el mismo
  bloque condicional que el CTA de registro/login. La búsqueda persistente para cualquier
  sesión vive ahora en el Header (`HeaderSearch`, ver `openspec/changes/add-header-search`).

## Pendiente

- Definir el rol/cuenta de plataforma que permita publicar listas editoriales
  (`product_philosophy.md` §7) — cuando se resuelva, este documento debe actualizarse para
  que "listas públicas recientes" distinga listas oficiales.
- Copy y diseño visual concreto de cada bloque (fuera del alcance de este documento, que
  cierra la estructura de contenido, no el layout).
