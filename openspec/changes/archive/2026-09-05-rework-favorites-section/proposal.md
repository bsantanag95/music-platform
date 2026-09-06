## Why

Hoy `/me/favorites` es una lista plana de texto: filas con el título del objetivo, la
audiencia y la fecha, más "quitar" y "cargar más". No hay portadas, ni agrupación por tipo,
ni forma de filtrar u ordenar, y la audiencia —que siempre nace en `followers` porque
`FavoriteButton` no la deja elegir— no se puede revisar ni cambiar desde ninguna parte de la
UI (`updateFavoriteAudience` existe en la API y nada la invoca). Como los favoritos ya
asoman en el feed, el perfil y el inicio, la página propia no tiene una razón de ser propia:
es una versión más pobre de lo que ya se ve en otro lado.

Este cambio convierte `/me/favorites` en el **retrato personal del gusto**: la única vista
completa y navegable de todo lo que marcaste, como un estante — agrupado en artistas, álbumes
y canciones— y el lugar donde se gestiona su privacidad. Mantiene el mundo visual vigente
("The Vinyl Listening Room", `DESIGN.md`) y los principios de producto (señal liviana sin
escala, sin gamificación, grafo social explícito, descubrimiento no algorítmico).

## What Changes

- **`/me/favorites` pasa a ser una superficie única enriquecida, sin sub-navegación.**
  Deliberadamente **no** se agrega una pestaña social de "favoritos de quienes seguís": ese
  descubrimiento ya lo cubren el feed y el perfil de cada persona, y favoritos queda como el
  espacio personal que contrapesa a la sección de listas (ya volcada a lo social con
  Guardadas y Descubrir).

- **Encabezado-retrato:** conteo por tipo como dato (`IBM Plex Mono`) — p. ej. "14 artistas ·
  22 álbumes · 9 canciones" — para orientar sin gamificar (sin barras de progreso, sin
  "pendientes", sin medallas).

- **Muro agrupado por tipo:** cuadrícula responsiva (1 col mobile / 2–3 col desde `sm`),
  seccionada en artistas, álbumes y canciones. Tres tratamientos de ficha:
  - **Álbum:** carátula cuadrada (`CoverThumb`).
  - **Artista:** placa tipográfica (nombre en `Space Grotesk` sobre `ink-surface`), sin
    imagen — los artistas no exponen carátula.
  - **Canción:** silueta de disco (`DiscPlaceholder`) con el título — las canciones no
    exponen carátula en ninguna superficie del producto, y no se agrega aquí.
  Cada ficha enlaza al objetivo de catálogo, muestra su audiencia como etiqueta y ofrece
  "quitar".

- **Toolbar contextual** (mismo patrón que `/me/lists` y `/me/diary`: `FilterSelect` +
  buscador con debounce + `useInfiniteQuery`): búsqueda por texto sobre el título del
  objetivo, filtro por tipo de entidad, filtro por audiencia y orden (recencia / alfabético).
  Todos combinables y aplicados en el servidor sobre el conjunto completo de favoritos.

- **Gestión de audiencia (capacidad nueva de gestión, no de curaduría):**
  - **Por favorito:** selector de audiencia en línea en cada ficha (`private` / `followers` /
    `public`), consumiendo el `PATCH` ya existente, con actualización optimista y rollback.
  - **En lote:** un modo "Seleccionar" agrega casillas a las fichas; una barra de acción
    fija ofrece cambiar la audiencia de las N seleccionadas de una vez. `PATCH
    /api/me/favorites` se amplía para aceptar `ids: string[]` además del `id` único.

- **Vista de perfil ajeno `/users/[username]/favorites`** hereda el muro (mismo tratamiento
  de fichas y agrupación) en modo lectura: sin selector de audiencia, sin modo selección, sin
  "quitar". La matriz de visibilidad no cambia.

- **API aditiva y retrocompatible:**
  - `GET /api/me/favorites` acepta `q` / `type` / `audience` / `sort` opcionales y devuelve
    además el conteo por tipo (`counts`). La forma de `target` no cambia (carátula solo para
    álbumes, como hoy).
  - `PATCH /api/me/favorites` acepta `{ ids: string[], audience }` (1..N, con un máximo) además
    de `{ id, audience }`.

- **Fuera de alcance (anti-objetivos explícitos):** pestaña o superficie de descubrimiento
  social de favoritos; nota, texto libre u orden manual / fijar por favorito (eso es
  territorio de listas); rediseño de `FavoriteButton` en las páginas de catálogo (solo se
  toca si el contrato lo obliga, y no lo obliga); cualquier contador o insignia de "marcaste
  favorito pero no valoraste / no escuchaste"; cambios en el `Header` global, en el feed de
  actividad, en el sistema de doble rating o en el modelo de datos del favorito.

## Capabilities

### New Capabilities

_(Ninguna. Todo el cambio recae sobre la capacidad `favorites` existente; no se introduce
descubrimiento social ni un modelo de datos nuevo.)_

### Modified Capabilities

- `favorites`:
  - `Requirement: Lista de favoritos propios` — la respuesta acepta parámetros opcionales de
    búsqueda (`q`), filtro por tipo (`type`), filtro por audiencia (`audience`) y orden
    (`sort`), combinables y aplicados en servidor sobre el conjunto completo; e incluye el
    conteo por tipo (`counts`).
  - `Requirement: Favoritos ajenos en el perfil` — la superficie de lectura se presenta como
    el mismo muro agrupado por tipo, en modo lectura.

### Added Requirements (dentro de `favorites`)

- `Requirement: Muro de favoritos agrupado por tipo` — presentación de `/me/favorites` y de
  la vista de perfil como una superficie única, agrupada en artistas / álbumes / canciones,
  con los tres tratamientos de ficha y la silueta de disco como recurso ante la ausencia de
  imagen; encabezado con el conteo por tipo; sin sub-navegación.
- `Requirement: Cambio de audiencia en lote de favoritos propios` — el usuario puede cambiar
  la audiencia de varios favoritos propios a la vez de forma idempotente; comportamiento ante
  ids inexistentes o ajenos en el conjunto; la operación no crea, modifica ni elimina
  escuchas, ratings ni comentarios.

## Impact

- **Base de datos:** sin migraciones. La tabla `favorite` ya tiene `audience` y marcas de
  tiempo; el cambio en lote es un `UPDATE ... WHERE id = ANY(:ids) AND user_id = :user` y el
  conteo por tipo es un agregado acotado sobre la misma tabla.
- **API:**
  - `GET /api/me/favorites`: nuevos query params (`q`, `type`, `audience`, `sort`) y campo
    nuevo en la respuesta (`counts`). Aditivo — actualizar `route.test.ts` y
    `docs/04-api/contracts.md`.
  - `PATCH /api/me/favorites`: acepta `{ ids: string[], audience }`; `{ id, audience }` sigue
    funcionando. Aditivo.
- **Servicios:** `src/services/favorites/favorites.ts` —
  `listMyFavorites` (params + orden + conteo),
  `updateFavoritesAudienceBulk` (nuevo, sobre la validación de propiedad ya existente).
  `src/services/social/visibility.ts` se reutiliza sin cambios de reglas.
- **Frontend:**
  - `src/app/[locale]/me/favorites/page.tsx` (siembra de filtros desde `searchParams`),
    `src/app/[locale]/users/[username]/page.tsx` (la sección de favoritos pasa al muro de
    lectura).
  - `src/components/favorites/*`: nuevos `FavoritesWall`, `FavoriteTile` (tres
    tratamientos), `FavoritesToolbar`, modo selección + barra de acción fija; se retira
    `FavoritesList` o se reduce a la vista de perfil. `FavoriteButton` no se toca.
  - Reutiliza `FilterSelect`, `EmptyState`, `Button`, `CoverThumb`, `DiscPlaceholder`,
    `useInfiniteQuery`, `queryKeys`.
- **Capa de acceso:** `src/lib/api/favorites.ts` — `getMyFavorites` con filtros,
  `updateFavoritesAudienceBulk`; esquemas Zod nuevos en `src/lib/api/schemas.ts`; claves en
  `src/lib/query/keys.ts` (`queryKeys.myFavorites(filters)`).
- **i18n:** `messages/{es,en}/favorites.json` — claves nuevas (encabezado con conteos,
  toolbar, filtros, modo selección, barra de acción en lote, estados vacíos filtrados,
  etiquetas de los tres tipos de ficha).
- **Tests:** servicios (filtros / orden / conteo / carátula de canción / cambio en lote
  idempotente y con ids ajenos), rutas (params y campos nuevos, `ids` en el `PATCH`,
  retrocompatibilidad), componentes (muro agrupado, los tres tratamientos de ficha, selector
  de audiencia optimista, modo selección y barra de acción, estados vacío y filtrado-vacío).
- **Docs:** `docs/04-api/contracts.md`, `docs/05-features/lists-and-favorites.md` (mover el
  plan de favoritos de "propuesto" a implementado), `docs/05-features/README.md` si aplica.
- **Sin dependencias nuevas.** Sin cambios en el `Header`, en el feed de actividad, en el
  sistema de doble rating, en el modelo de datos del favorito ni en el contrato de la acción
  contextual de catálogo.
