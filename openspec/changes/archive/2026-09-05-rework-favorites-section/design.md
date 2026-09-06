## Context

`/me/favorites` hoy es una sola página (`src/app/[locale]/me/favorites/page.tsx` →
`FavoritesList`): un Server Component que resuelve la primera página con `listMyFavorites` y
un client component que pagina a mano (`useState` + `handleLoadMore`) y quita favoritos. La
lectura ajena (`/users/[username]/page.tsx`) reusa `FavoritesList` en modo `readOnly`. No hay
toolbar, ni agrupación, ni portadas más allá del álbum.

El modelo de datos del favorito está cerrado por `add-favorites-and-lists`: tabla `favorite`
con exactamente una de `artist_id` / `release_group_id` / `recording_id` (CHECK
`num_nonnulls = 1`), `audience` (`private`/`followers`/`public`, default `followers`),
`created_at`, y borrado físico. `updated_at` lo mantiene un trigger. La acción contextual
(`FavoriteButton` en artista/álbum/canción) hoy marca siempre con audiencia `followers`
—no ofrece elegirla— y el `PATCH /api/me/favorites` para cambiar la audiencia de un favorito
existe pero ningún componente lo invoca.

Este diseño implementa el plan aprobado en la fase de shape: superficie única enriquecida
(sin sub-navegación), muro agrupado por tipo con tres tratamientos de ficha, toolbar de
búsqueda/filtro/orden reutilizando el patrón de `/me/lists` y `/me/diary`, y gestión de
audiencia por favorito y en lote. Explícitamente **no** se agrega descubrimiento social de
favoritos.

## Goals / Non-Goals

**Goals:**
- Convertir `/me/favorites` en el retrato completo y navegable del gusto propio sin romper la
  URL ni el `Header`.
- Reutilizar componentes y patrones existentes (`FilterSelect`, `EmptyState`, `CoverThumb`,
  `DiscPlaceholder`, `useInfiniteQuery`, el buscador con debounce de `MyListsTab`).
- Cerrar el hueco de gestión de audiencia: editable por favorito y en lote, con cambios de
  API mínimos y aditivos.
- Cero migraciones de base de datos.

**Non-Goals:**
- Pestaña o superficie de "favoritos de quienes seguís" / descubrimiento social.
- Nota, texto libre, orden manual o "fijar" por favorito (territorio de listas).
- Resolver una carátula para favoritos de canción o de artista (ninguna superficie del
  producto lo hace hoy; introducirlo acá crearía inconsistencia con el feed).
- Rediseñar `FavoriteButton` ni cambiar el contrato de la acción contextual de catálogo.
- Contadores o insignias de "favoritos sin valorar / sin escuchar".
- Cambios en el feed de actividad, el `Header`, el doble rating o el modelo del favorito.

## Decisions

### 1. Superficie única sin sub-navegación, Server Component + `useInfiniteQuery`

`me/favorites/page.tsx` sigue siendo Server Component: lee los filtros de `searchParams`
(para que un muro filtrado sea enlazable), resuelve la primera página con `listMyFavorites` y
la pasa como `initialData` a un client component (`FavoritesWall`). La paginación y los
cambios de filtro posteriores son cliente (`useInfiniteQuery` + buscador con debounce),
exactamente como `MyListsTab`.

- **Alternativa — sección con pestañas igual que `/me/lists`:** descartada en shape.
  Favoritos es el espacio personal que contrapesa a listas (ya volcada a lo social). El
  descubrimiento social de favoritos ya lo cubren el feed y el perfil de cada persona; una
  pestaña propia lo duplicaría. "Mismo patrón que listas" se honra con el lenguaje visual y
  estructural (fichas enriquecidas, toolbar, muro táctil, estados), no con la cantidad de
  pestañas.
- **Consecuencia:** no hay `?tab=`; los únicos parámetros de URL son los filtros (`q`,
  `type`, `audience`, `sort`), y solo cuando difieren del default.

### 2. Una sola consulta paginada ordenada por `(rango de tipo, sort)`; el cliente agrupa

`listMyFavorites` conserva la forma de consulta actual (join×3 → where → orderBy → limit →
offset) y solo cambia:
- **WHERE:** condiciones opcionales por `type`, `audience` y `q`.
- **ORDER BY:** primero un rango fijo de tipo (`artist` → `release-group` → `recording`),
  luego el `sort` pedido (`recent` = `created_at` desc; `alpha` = `lower(coalesce(titulo))`
  asc), y `id` de desempate.

El muro recibe la lista plana ya ordenada y la **agrupa en el cliente** en tres secciones
tituladas (cada una con su conteo tomado de `counts`). "Cargar más" (`useInfiniteQuery`)
sigue avanzando por el mismo orden, así que una sección se completa antes de empezar la
siguiente. Cuando el filtro `type` está activo, la respuesta ya es de un solo tipo y el muro
muestra una sola sección.

- **Alternativa — tope por tipo con `row_number() over (partition by tipo)` + "ver todos":**
  descartada por over-engineering. Los favoritos son una señal liviana (decenas, no cientos);
  el orden por rango de tipo + el filtro de tipo como escape cubre el caso de volumen sin una
  forma de consulta nueva ni un modo de respuesta partido.
- **Alternativa — orden puramente cronológico, agrupado en el cliente:** descartada; con
  "cargar más" cronológico entre tipos las secciones crecen de forma despareja y una podría
  quedar vacía teniendo elementos más abajo.
- **Alternativa — tres `useInfiniteQuery`, uno por tipo:** descartada; 3× requests y estado
  de toolbar triplicado para nada.
- **Consecuencia:** el mock de tests existente (`joinPaged`) sigue sirviendo; solo se agrega
  un helper para el agregado de `counts`.

### 3. `counts` por un agregado acotado, no materializado

Un `select count(*) ... group by (artist_id is not null, release_group_id is not null,
recording_id is not null)` sobre `favorite where user_id = :user`. Es O(favoritos del
usuario), con el índice existente por `user_id`. Va en la misma respuesta que la primera
página.

- **Alternativa — columna materializada con trigger:** descartada; no hace falta a este
  volumen y suma un trigger a mantener (mismo criterio que `itemCount` en la rework de
  listas).

### 4. Filtro `q` y `sort=alpha` sobre el título del objetivo coalescido

El título de un favorito vive en una de tres tablas left-join (`artist.name`,
`release_group.title`, `recording.title`). El filtro y el orden operan sobre
`coalesce(artist.name, release_group.title, recording.title)`:
- `q`: `ilike(coalesce(...), '%' || q || '%')` — coincidencia parcial sin distinguir
  mayúsculas, igual criterio que `ilike(userList.title, ...)` en `lists.ts` (sin `unaccent`).
- `sort=alpha`: `asc(lower(coalesce(...)))`, con `id` como desempate; `sort=recent` (default):
  `desc(created_at), desc(id)`.

- **Alternativa — `unaccent`:** descartada por consistencia con el buscador de listas y
  diario, que no lo usan. Si se decide más adelante, es un cambio transversal a esos tres.

### 5. `PATCH /api/me/favorites` amplía su body a `{ ids, audience }`

El schema Zod pasa a una unión: `{ id: string, audience }` (retrocompat) **o**
`{ ids: string[] (1..50), audience }`. El servicio nuevo `updateFavoritesAudienceBulk(userId,
ids, audience)` hace un único `update favorite set audience = :audience where id = any(:ids)
and user_id = :user returning *`. Si `returning` viene vacío → `404 FAVORITE_NOT_FOUND`. Los
ids ajenos/inexistentes del conjunto simplemente no entran en el `where` y se ignoran. El
límite de 50 acota el tamaño del `PATCH` y del rollback optimista.

- **Alternativa — endpoint nuevo `PATCH /api/me/favorites/audience`:** descartada; el `PATCH`
  actual ya es "cambiar audiencia de favorito(s)", la unión de body es suficiente y evita
  otra ruta y otro test file.
- **Alternativa — `id` único siempre, el cliente hace N requests:** descartada; N escrituras
  para una acción que el usuario percibe como una, sin atomicidad.

### 6. Actualización optimista con rollback, patrón de favoritos

Tanto el selector de audiencia por ficha como la barra de acción en lote usan una mutación de
TanStack Query con `onMutate` (aplica el cambio en la caché de `queryKeys.myFavorites(...)`),
`onError` (revierte al snapshot) y `onSettled` (invalida). Mismo patrón que el toggle de
`SaveListButton` y `FavoriteButton`.

### 7. Modo selección como estado local de cliente, barra de acción fija

`FavoritesWall` mantiene `selectionMode: boolean` y `selectedIds: Set<string>` en `useState`.
Al activarse, cada `FavoriteTile` muestra una casilla; una barra fija (bottom-sticky en
mobile) muestra "N seleccionados" con `aria-live="polite"`, un `FilterSelect`/grupo de
opciones de audiencia y "Listo" (también sale con `Escape`). No hay tablist ni navegación por
flechas. La selección se pierde al cambiar de filtro o recargar (aceptable para una acción de
gestión puntual).

### 8. Tres tratamientos de ficha en un componente `FavoriteTile`

- **Álbum:** `CoverThumb` cuadrado + título + artista acreditado (ya disponible vía el join
  de `release_group`; el artista se resuelve con el mismo `PRIMARY_ARTIST_SQL` que usa el
  feed, o se omite si complica — decisión abierta menor).
- **Artista:** sin imagen; nombre en `font-display` sobre `ink-surface` con hairline
  `ink-border`, etiqueta `artista` en `font-data`. Lee como el lomo de una funda.
- **Canción:** `DiscPlaceholder` (la silueta de surcos del sistema) + título + etiqueta
  `canción`.
Todas: `<article>` con un enlace primario al objetivo, borde a `amber` en
`hover`/`focus-within`, sin sombra (Regla No-Shadow). La imagen/placa va `aria-hidden`.

### 9. Perfil ajeno: mismo muro en modo lectura, sin toolbar

`users/[username]/page.tsx` deja de renderizar `FavoritesList` y renderiza `FavoritesWall`
con `readOnly`: muro agrupado por tipo, "cargar más" con `getUserFavorites`, sin selector de
audiencia, sin selección, sin quitar. `listUserFavorites` gana el mismo `counts` y el mismo
orden por rango de tipo. La matriz de visibilidad (`audiencesForProfile`) no cambia.

## Risks / Trade-offs

- **[La selección en lote se pierde al filtrar o recargar]** → aceptado; es una acción de
  gestión ocasional, no un flujo largo. Documentado en la UI con el botón "Listo" explícito.
- **[Volumen alto de un tipo en la vista "todos"]** → el orden por rango de tipo mantiene
  cada sección contigua; el filtro de tipo acota la consulta cuando hace falta. Aceptable
  para el volumen real de favoritos.
- **[`coalesce` de título en `q`/`sort` no usa índice]** → a nivel de favoritos de un usuario
  (decenas a bajos cientos) el scan es barato; si aparece presión real, un índice funcional
  es un cambio posterior aislado. Mismo perfil que el buscador de listas.
- **[Ampliar el body del `PATCH` a una unión puede romper un cliente que mande campos extra]**
  → el parseo Zod con `safeParse` ya rechaza el body inválido con `VALIDATION_ERROR`; la
  unión acepta el `{ id, audience }` previo tal cual.
- **[Inconsistencia percibida: la canción no tiene carátula acá pero el álbum sí]** → es la
  realidad del catálogo y del resto del producto (feed, diario); la silueta de disco es el
  objeto-firma del sistema, no un placeholder de carencia.
- **[Reemplazar `FavoritesList` toca la página de perfil]** → cambio contenido: el perfil ya
  pasaba `readOnly`/`empty`; se sustituye el componente hijo, no la sección.

## Migration Plan

1. Sin migraciones SQL.
2. Ampliar schema Zod (`schemas.ts`): `q`/`type`/`audience`/`sort` en el request de listado,
   `counts` en la respuesta, unión `{ id | ids, audience }` en el `PATCH`.
3. Servicios: `listMyFavorites` (params + orden por rango de tipo + `counts`),
   `listUserFavorites` (orden por rango de tipo + `counts`), `updateFavoritesAudienceBulk`
   (nuevo).
4. Rutas: `GET /api/me/favorites` (lee query params), `PATCH /api/me/favorites` (unión de
   body), `GET /api/users/[username]/favorites` (`counts`). Todo aditivo.
5. Frontend: `FavoritesWall`, `FavoriteTile`, `FavoritesToolbar`, barra de acción de
   selección; adaptar `page.tsx` propio y de perfil; retirar/reducir `FavoritesList`.
6. i18n, tests, docs.
7. **Rollback:** revertir el código. No hay estado nuevo que limpiar; los favoritos y sus
   audiencias quedan como estaban.

## Open Questions

- **¿La ficha de álbum muestra el artista acreditado?** Recomendación: sí, con
  `PRIMARY_ARTIST_SQL` (ya existe); si complica la consulta del tope-por-tipo, omitir en v1.
- **¿El buscador `q` cubre también el nombre del artista acreditado de un álbum/canción?**
  Recomendación: no en v1, solo el título del objetivo, igual que el buscador de listas.
- **¿La vista de perfil ajeno necesita su propia ruta `/users/[username]/favorites` para el
  "ver todos"?** Recomendación: no; "cargar más" inline por tipo alcanza. Reabrir si se pide.
- **¿Límite del lote en 50?** Recomendación: 50; suficiente para una limpieza de audiencia
  real y acota el rollback optimista.
