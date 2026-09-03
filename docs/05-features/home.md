# Inicio — landing diferenciado por sesión

**Fase:** 5 (roadmap), navegación autenticada definida en `phase-5-design.md` §10.1.
**Estado:** ✅ Estructura de contenido implementada (`add-home-page`). Layout visual del
visitante anónimo rediseñado en `redesign-frontend` — ver "Hero visual del visitante
anónimo" más abajo.

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
- El feed compacto de Inicio (`listFollowingFeedPreview`) es un wrapper fino sobre
  `listFeed` con `pageSize` chico — mismo contrato que `/me/feed`.
- El render por tipo de actividad se comparte entre `/me/feed` y los tres bloques de Inicio
  vía `FeedEntryCard`/`FeedEntryBody` (`src/components/feed/FeedEntryBody.tsx`).
- No hizo falta ningún rol/permiso nuevo — "listas públicas recientes" usa el mismo campo
  `audience` que ya expone `userList`.
- El hero ya no monta un `SearchForm` propio (lo hacía gateado a `!user` en
  `src/app/[locale]/page.tsx`). Con el rediseño, la única entrada de búsqueda es
  `HeaderSearch` en el Header, visible en todos los estados (ver
  `openspec/changes/add-header-search` para el origen del componente).

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

## Pendiente

- Definir el rol/cuenta de plataforma que permita publicar listas editoriales
  (`product_philosophy.md` §7) — cuando se resuelva, este documento debe actualizarse para
  que "listas públicas recientes" distinga listas oficiales, y habilita la variante "tabla
  editorial" / "lista destacada" como fuente del muro de carátulas del hero.
- Muro de carátulas del hero anónimo con **24 carátulas curadas a mano**, cuando el guardado
  definitivo de imágenes esté implementado — ver "implementación futura" arriba.
- Copy y diseño visual concreto de cada bloque (fuera del alcance de este documento, que
  cierra la estructura de contenido, no el layout).
