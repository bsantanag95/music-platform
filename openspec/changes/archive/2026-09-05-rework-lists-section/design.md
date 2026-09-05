## Context

`/me/lists` hoy es una sola página (`src/app/[locale]/me/lists/page.tsx` → `ListsList`): un
Server Component que resuelve la primera página con `listMyLists` y un client component que
pagina a mano (`useState` + `handleLoadMore`), crea listas con un `ListForm` colapsable y
borra con confirmación. El detalle (`/me/lists/[listId]` → `ListDetail`) edita metadatos,
reordena ítems por botones ↑/↓ y borra. La lectura ajena (`/users/[username]/lists`) reusa
`ListsList` en modo `readOnly`.

El modelo de datos (`user_list`, `user_list_item`) está cerrado por `add-favorites-and-lists`:
tipo de entidad único por lista, dueño único, orden manual de ítems, borrado físico en
cascada, `updated_at` mantenido **solo por trigger de base de datos**. El feed
(`src/services/feed/feed.ts`) se compone bajo demanda fusionando cinco fuentes en memoria y ya
incluye eventos de lista (creación y actualización de metadatos) de las personas seguidas,
además de filtros `kind`/`authorId`/`q` (`add-feed-filters`).

Este diseño implementa el plan aprobado en `docs/05-features/lists-and-favorites.md`: sección
con sub-navegación (Mis listas · Guardadas · Descubrir), tarjetas con mosaico de portadas y
conteo, búsqueda/filtro/orden, creación inline, fijar listas, y guardar/seguir listas ajenas
con su integración al feed.

## Goals / Non-Goals

**Goals:**
- Convertir `/me/lists` en una sección navegable sin romper la URL del detalle ni el `Header`
  global.
- Enriquecer la representación de una lista (mosaico + conteo) reutilizando componentes de
  catálogo ya existentes.
- Reusar el patrón de herramientas de `/me/feed` y `/me/diary` (`FilterSelect`, buscador con
  debounce, `useInfiniteQuery`) en vez de inventar uno nuevo.
- Añadir guardar/seguir listas ajenas y descubrir listas públicas con cambios de esquema
  mínimos y aditivos.
- Integrar las listas seguidas al feed sin materializar eventos (misma composición bajo
  demanda).

**Non-Goals:**
- Listas colaborativas o de varios tipos de entidad.
- Orden manual total de las listas propias (solo "fijar" en v1).
- Ranking algorítmico o personalización en Descubrir.
- Contador público de guardados como métrica social.
- Drag-and-drop para reordenar ítems del detalle (sigue con ↑/↓).
- Cambios en el `Header`, en el sistema de doble rating, o en el contrato del detalle de
  lista.

## Decisions

### 1. Sub-navegación por `?tab=` con render en servidor, no rutas separadas ni estado puro de cliente

La página `me/lists/page.tsx` lee `searchParams.tab` (Server Component), valida contra
`{ mine, saved, discover }` con fallback a `mine`, y renderiza el panel correspondiente
resolviendo su primera página en el servidor (`listMyLists` / `listSavedLists` /
`listDiscoverLists`). La tira de pestañas es un client component con `<Link>` a
`?tab=<valor>` y semántica `role="tablist"`/`tab`/`tabpanel` con navegación por flechas,
tomada de `PopularCommentsTabs`.

- **Alternativa — rutas `/me/lists/saved` y `/me/lists/discover`:** descartada. `[listId]` ya
  vive bajo `/me/lists`; sumar segmentos fijos obliga a distinguir `saved` de un `listId` y
  multiplica el boilerplate de layout/encabezado.
- **Alternativa — estado de pestaña solo en cliente:** descartada por el plan (debe ser
  enlazable y sobrevivir al reload).
- **Consecuencia:** cambiar de pestaña es un round-trip al servidor (coherente con "Server
  Components para la carga inicial"). La paginación y el filtrado dentro de cada pestaña son
  cliente (`useInfiniteQuery`), sembrados con `initialData` de la primera página.

### 2. `itemCount` y `coverThumbs` por una consulta adicional acotada a la página, no N+1

Tras traer la página de listas (20 filas máx.), una segunda consulta resuelve para esos
`list_id`:
- `itemCount`: `count(*)` de `user_list_item` agrupado por `list_id`.
- `coverThumbs`: `row_number() over (partition by list_id order by position)` sobre
  `user_list_item` join `release_group`, filtrando `rn <= 4` y carátula no nula. Para listas
  de artista/canción no hay carátula: `coverThumbs` queda vacío y la UI cae al mosaico de
  discos.

- **Alternativa — subconsulta `LATERAL` por fila:** equivalente en resultado; se elige la
  consulta con `row_number` por ser un solo escaneo con el índice existente
  `user_list_item(list_id, position)`.
- **Alternativa — columna materializada `item_count` con trigger:** descartada; no hace falta
  a este volumen y suma otro trigger a mantener.

### 3. Fijar listas en tabla aparte `user_list_pin`, no en una columna de `user_list`

`user_list_pin (owner_id, list_id, pinned_at timestamptz not null default now())`, PK
`(owner_id, list_id)`, FKs con `ON DELETE CASCADE` desde `app_user` y `user_list`. El orden de
la superficie propia es: fijadas primero (por `pinned_at` desc), luego el resto según `sort`.

- **Razón para no usar `user_list.pinned_at`:** `updated_at` de `user_list` lo mantiene un
  trigger en **cualquier** `UPDATE`, y el feed deriva los eventos de "lista actualizada" de
  ese `updated_at`. Escribir el pin en `user_list` generaría un evento de actualización
  falso en el feed de todos sus seguidores. Una tabla aparte deja `user_list` intacto.
- **Alternativa — excepción en el trigger:** descartada por invasiva y frágil.
- **Trade-off:** una tabla más y un join extra al ordenar; aceptable y aislado.

### 4. `list_save` para guardar y seguir

`list_save (saver_id, list_id, following boolean not null default false, created_at
timestamptz not null default now())`, PK `(saver_id, list_id)`, FKs `ON DELETE CASCADE` desde
`app_user` y `user_list`. Guardar/actualizar seguir es un `INSERT ... ON CONFLICT (saver_id,
list_id) DO UPDATE SET following = excluded.following`. Quitar es un `DELETE` idempotente. La
API valida antes: la lista existe, es visible para el `saver` (reusa la matriz de
`audiencesForProfile` + bloqueos), y no es propia.

- **Alternativa — reusar `favorite`:** descartada; favorito es sobre artista/álbum/canción,
  tiene audiencia propia y semántica social distinta. Una lista guardada es privada y tiene
  el eje extra `following`.

### 5. Feed de listas seguidas: trasladado a un cambio de continuación

El plan original sumaba a `listFeed` una sexta fuente (eventos de actualización de listas en
`list_save where following = true`, filtrados por visibilidad del dueño) fusionada y
deduplicada con la fuente de "eventos de lista de personas seguidas".

**Durante la implementación se decidió sacarlo de esta entrega.** La composición del feed es
bajo demanda con `Promise.all` sobre 5 fuentes y ~11 tests que mockean `db.select` por
posición; agregar una sexta fuente rompe esa numeración en cada test y mezcla un cambio de
`activity-feed` (spec + tests propios) dentro de un cambio ya grande de la sección de listas.

En esta entrega: `following` se persiste en `list_save` y se expone
(`saved-lists.ts`: `followedListIds(saverId)`, `savedStateFor(...)`). El cambio de
continuación **`add-followed-lists-to-feed`** modifica `activity-feed` y consume esos
helpers, con la clave de deduplicación `("list", list_id, event, updated_at)`.

- **Alternativa — tabla de eventos materializada:** sigue descartada; el feed es bajo demanda
  por decisión de `activity-feed`.

### 6. Descubrir: listas `public` de perfiles `public`, sin bloqueo, orden `created_at` desc

`listDiscoverLists` consulta `user_list` con `audience = 'public'`, join a perfil del dueño
con `visibility = 'public'`, excluyendo `owner_id = :reader` y cualquier bloqueo en las dos
direcciones; enriquece con `itemCount`/`coverThumbs` (decisión 2) y con el estado de guardado
del lector (`left join list_save`). Orden por `created_at` desc, paginado por offset como el
resto.

- **Por qué excluir perfiles privados aunque la lista sea `public`:** Descubrir es una
  vidriera de la comunidad; una lista pública de un perfil privado sigue siendo alcanzable
  por su URL directa para quien tenga permiso, pero no se promociona en la vidriera. Coherente
  con "el grafo social es explícito".
- **Orden por cantidad de guardados:** diferido; requiere un `count` sobre `list_save` que a
  este volumen no aporta.

### 7. Componentes nuevos, todos dentro de `src/components/lists/`

- `ListsSection` (client): tira de pestañas + `tabpanel`, lee/escribe `?tab=`.
- `ListCard` (server): mosaico + título + metadatos (tipo, conteo, audiencia/dueño), usada en
  las tres pestañas y en el perfil ajeno.
- `ListCoverMosaic` (server): grilla 2×2 de `CoverThumb`/`LazyCoverImage` o `DiscPlaceholder`;
  sin sombras (DESIGN.md), separación por hairline `ink-border`; sin movimiento salvo un
  realce de borde en hover, con `prefers-reduced-motion`.
- `MyListsTab`, `SavedListsTab`, `DiscoverListsTab` (client): `useInfiniteQuery` + toolbar
  (solo Mis listas) + estados vacíos propios.
- `SaveListButton` (client): toggle Guardar + toggle Seguir, optimista con rollback (patrón de
  `favorites`).
- `ListForm` se reusa para la creación inline en Mis listas; `ListsList` y `ListDetail` se
  adaptan (tarjeta nueva, mosaico en cabecera del detalle).

### 8. Capa de acceso: `src/lib/api/lists.ts` + Zod + claves de React Query

Funciones cliente nuevas (`getMyLists` con filtros, `pinList`/`unpinList`, `saveList`/
`unsaveList`/`getSavedLists`, `getDiscoverLists`) todas por `apiFetch` + esquema Zod en
`src/lib/api/schemas.ts`. Claves en `src/lib/query/keys.ts`: `queryKeys.myLists(filters)`,
`queryKeys.savedLists()`, `queryKeys.discoverLists()`.

## Risks / Trade-offs

- **[Deduplicación y visibilidad del feed de listas seguidas es la parte más frágil]** →
  resuelto sacándolo de esta entrega (ver Decisión 5); va al cambio
  `add-followed-lists-to-feed`.
- **[Coste de la consulta de `coverThumbs`/`itemCount` al escalar]** → acotada a los ≤20
  `list_id` de la página, apoyada en el índice `user_list_item(list_id, position)`; si
  aparece presión real, materializar `item_count` es un cambio posterior aislado.
- **[Cambiar de pestaña = round-trip al servidor]** → aceptado; es coherente con la
  arquitectura y la primera carga de cada pestaña es la única server-side, el resto es
  cliente. La tira de pestañas puede hacer prefetch de `<Link>` de Next.
- **[`user_list_pin` y `list_save` añaden dos tablas y joins de orden/estado]** → contenido;
  ambos son 1:N simples con índices por PK y cascada.
- **[Mosaico con varias imágenes puede causar layout shift]** → tiles `aspect-square` de
  tamaño fijo y `LazyCoverImage` (ya resuelve carga diferida y fallback de carátula fallida).
- **[Navegación back/forward del navegador ahora mueve entre pestañas]** → es el
  comportamiento deseado (pestañas enlazables); documentado.

## Migration Plan

1. Migraciones SQL nuevas (archivos nuevos, nunca editar aplicadas):
   - `list_save` con su PK, FKs en cascada e índice por `saver_id`.
   - `user_list_pin` con su PK, FKs en cascada e índice por `owner_id`.
2. Actualizar el esquema Drizzle (`src/db/schema.ts`) y los tipos inferidos.
3. Desplegar el código: endpoints y servicios nuevos son aditivos; los `GET` existentes ganan
   campos y query params opcionales, retrocompatibles.
4. **Rollback:** revertir el código y `DROP TABLE list_save, user_list_pin`. No hay pérdida de
   datos en el núcleo de listas; se pierden guardados y fijados, que son metadatos
   reconstruibles por el usuario.

## Open Questions

- **~~¿"Seguir" (integración al feed) entra en esta entrega?~~** Resuelto: no. `following` se
  persiste y se expone; el feed se conecta en `add-followed-lists-to-feed` (ver Decisión 5).
- **¿El mosaico usa 3 o 4 carátulas?** Recomendación: 4 (grilla 2×2).
- **¿Se le muestra al dueño algún conteo de guardados de su propia lista?** Recomendación: no
  en v1 (mantener la superficie sin métricas).
- **¿Descubrir incluye alguna vez listas públicas de perfiles privados?** Recomendación: no;
  reabrir solo si se pide explícitamente.
- **¿El buscador de Mis listas también busca en la descripción?** Recomendación: no en v1
  (solo título), igual que el buscador de `/me/diary`.
