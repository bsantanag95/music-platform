## Context

`/me/collection` hoy es una sola página (`src/app/[locale]/me/collection/page.tsx` →
`CollectionList`): un Server Component que resuelve la primera página con `listOwnCollection` y
un client component que pagina a mano (`useState` + `handleLoadMore`), filtra por formato y
atributo, y quita entradas. La lectura ajena (`/users/[username]/page.tsx` → `ProfileCollection`)
reusa `CollectionList` en modo `readOnly`. No hay portadas, ni agrupación, ni orden, ni
búsqueda, ni edición: `updateEntry` y `PATCH /api/me/collection/{entryId}` existen pero ningún
componente de la superficie los invoca.

El modelo de datos está cerrado por `add-physical-collection`: tabla `collection_entry` con
`format` (conjunto cerrado de 4), `attributes` (array `text[]` con `CHECK` contra el vocabulario
de 17 de `drizzle/0012_physical_collection.sql`), `note` (≤140), `audience`
(`private`/`followers`/`public`, default `followers`), `created_at`, y borrado físico.
`updated_at` lo mantiene un trigger. Grano "por álbum + copia": varias entradas por álbum
permitidas, sin deduplicación. El artista acreditado de cada álbum ya se resuelve por lote
(`primaryArtistsFor`, join `credit` → `artist`, `role = 'primary'`, `recording_id IS NULL`,
orden por `position`).

Este diseño implementa el plan aprobado en shape: superficie única enriquecida (sin
sub-navegación), tres modos de visualización a elegir con preferencia local global, toolbar de
búsqueda/orden/agrupación reutilizando el patrón de `/me/lists`, `/me/favorites` y `/me/diary`,
edición de entrada en línea y cambio de audiencia en lote. Explícitamente **no** se agrega
descubrimiento social de colecciones.

## Goals / Non-Goals

**Goals:**
- Convertir `/me/collection` en la estantería completa y navegable de la colección propia sin
  romper la URL ni el `Header`.
- Reutilizar componentes y patrones existentes (`FilterSelect`, `EmptyState`, `CoverThumb`,
  `DiscPlaceholder`, `useInfiniteQuery`, el buscador con debounce de `MyListsTab`/`FavoritesWall`,
  el conmutador y la lógica de modos de `rework-list-detail`).
- Cerrar el hueco de gestión: editar formato/atributos/nota/audiencia por entrada desde la
  superficie, y cambiar la audiencia en lote, con cambios de API mínimos y aditivos.
- Cero migraciones de base de datos.

**Non-Goals:**
- Pestaña o superficie de "colecciones de quienes seguís" / descubrimiento social.
- Contador "N personas tienen este disco" (depende de densidad de datos y del cálculo robusto
  anti-sockpuppet de `product_philosophy.md` §6.2/§7).
- Aparición de la colección en el feed de actividad.
- Buscador de catálogo embebido / alta de entradas desde `/me/collection` (se descartó en el
  detalle de lista; el alta sigue desde la página del álbum).
- Wishlist / lista de deseados (modelo de datos nuevo).
- Imagen de portada por entrada, modelado de identidad de release (sello, país, número de
  catálogo, barcode, bonus tracks estructurados).
- Orden manual / fijar por entrada (territorio de listas). Rachas, % de completitud, insignias
  "sin valorar / sin escuchar".
- Cambios en el vocabulario o el modelo de datos de la colección, en `FavoriteButton`, el
  `Header`, el doble rating o el contrato de la acción contextual de catálogo.

## Decisions

### 1. Superficie única sin sub-navegación, Server Component + `useInfiniteQuery`

`me/collection/page.tsx` sigue siendo Server Component: lee los filtros de `searchParams` (para
que una estantería filtrada sea enlazable), resuelve la primera página con `listOwnCollection` y
la pasa como `initialData` a un client component (`CollectionShelf`). La paginación y los
cambios de filtro posteriores son cliente (`useInfiniteQuery` + buscador con debounce),
exactamente como `FavoritesWall`.

- **Alternativa — sección con pestañas igual que `/me/lists`:** descartada en shape. La colección
  es el espacio personal; el descubrimiento de colecciones ajenas ya pasa por el perfil de cada
  persona y —a futuro— por el contador de coleccionistas por álbum. "Mismo patrón que listas" se
  honra con el lenguaje visual y estructural (fichas con carátula, toolbar, modos de vista,
  estados), no con la cantidad de pestañas. Es la misma decisión que tomó `rework-favorites-section`.
- **Consecuencia:** no hay `?tab=`; los únicos parámetros de URL son los filtros (`q`, `format`,
  `attribute`, `sort`, `group`), y solo cuando difieren del default.

### 2. Tres modos de visualización; preferencia local, global, con `localStorage`

Se replica exactamente la mecánica de `rework-list-detail`:
- `collection-view-mode.ts` (no cliente): `type CollectionViewMode = "shelf" | "detailed" | "index"`,
  `DEFAULT_COLLECTION_VIEW_MODE = "shelf"`, clave de `localStorage`
  `"music-platform:collection-view-mode"`, `parseCollectionViewMode()`.
- `use-collection-view-mode.ts` ("use client"): `useState(DEFAULT)`, `useEffect` en montaje lee
  `localStorage` con try/catch, `update` escribe con try/catch. SSR y primer render usan el
  default (evita hydration mismatch); el modo guardado se aplica tras montar.
- `CollectionModeSwitcher.tsx` ("use client"): `role="radiogroup"`, tres `role="radio"` con
  `aria-checked`, `tabIndex` rotativo y navegación por flechas; iconos SVG inline `aria-hidden`;
  etiqueta visible desde `sm` (`sr-only sm:not-sr-only`). Activo: `bg-amber/10 text-amber`.
- **`shelf`** es el default (la colección es la superficie más visual). **`detailed`** e
  **`index`** son las variantes de trabajo.
- El modo es puramente de presentación cliente: no viaja en la URL ni afecta la consulta.
- La preferencia es **global** (compartida con el detalle de lista solo en mecánica, no en
  clave: cada superficie guarda la suya). Un valor inválido en `localStorage` cae al default.

- **Alternativa — un solo modo enriquecido:** descartada en shape; el usuario pidió los tres
  modos explícitamente, como en el detalle de lista.
- **Alternativa — preferencia por página / en servidor:** descartada; es una conveniencia por
  visitante, no dato de dominio. Mismo criterio que `rework-list-detail`.

### 3. Una sola consulta paginada ordenada por `(clave de grupo, sort, id)`; el cliente agrupa

`listOwnCollection` conserva la forma de consulta actual (join `release_group` → where → orderBy
→ limit+1 → offset) y solo cambia:
- **WHERE:** se suman condiciones opcionales por `q` (ver decisión 5). `format` y `attribute`
  siguen igual.
- **ORDER BY:** primero la **clave de grupo** según `group`
  (`none` → sin prefijo; `format` → un rango fijo `vinyl < cd < cassette < other`;
  `artist` → `lower(nombre del artista acreditado)` con las entradas sin artista al final),
  luego el **`sort`** pedido:
  - `recent` (default) → `created_at desc`
  - `alpha` → `lower(release_group.title) asc`
  - `artist` → `lower(nombre del artista acreditado) asc`
  - `format` → rango fijo de formato asc
  y `id` desc de desempate (estable con la paginación por offset actual).

  `sort` y `group` pueden coincidir (p. ej. `group=format` + `sort=format`): el `ORDER BY`
  resultante es idempotente, no se duplica la cláusula.

El shelf recibe la lista plana ya ordenada y **agrupa en el cliente** cuando `group !== "none"`,
con cada sección titulada y su conteo tomado de `counts` (para `format`) o contado sobre las
entradas cargadas (para `artist`, donde no hay un `counts` server-side). "Cargar más"
(`useInfiniteQuery`) avanza por el mismo orden, así que una sección se completa antes de empezar
la siguiente.

- **Alternativa — agrupar "por artista" como grupos reales server-side con `counts` por
  artista:** descartada; son potencialmente muchas secciones chicas y un agregado extra. Para
  `group=artist` el cliente secciona sobre lo cargado y el conteo de cada sección es el de las
  entradas visibles; "cargar más" completa cada artista antes de pasar al siguiente por el orden
  estable. Si se pide precisión de conteo por artista, es un incremento posterior.
- **Alternativa — `row_number() over (partition by ...)` + "ver todos" por grupo:** descartada
  por over-engineering; la colección es señal liviana y el filtro de formato/atributo + el orden
  por grupo cubren el volumen real.
- **Consecuencia:** el mock de tests de servicio existente sigue sirviendo; se agrega un helper
  para el agregado de `counts`.

### 4. `counts` por formato: un agregado acotado, no materializado

`select format, count(*) from collection_entry where user_id = :user [and <filtros de q/attribute>]
group by format`. Es O(entradas del usuario) con el índice existente por `user_id`. Va en la
misma respuesta que la primera página (campo `counts: { vinyl, cd, cassette, other }`, todos los
formatos presentes con 0 si no hay entradas).

Decisión de alcance del agregado: `counts` refleja **el conjunto tras aplicar `q` y
`attribute`** (para que el encabezado describa lo que se está mirando) pero **ignora el filtro
`format`** (para que el encabezado siga mostrando la distribución completa entre formatos aunque
haya un formato filtrado). Documentado en el spec.

- **Alternativa — columna materializada con trigger:** descartada; no hace falta a este volumen
  y suma un trigger a mantener (mismo criterio que `itemCount` en la rework de listas y `counts`
  en favoritos).

### 5. Filtro `q` sobre título de álbum + artista acreditado coalescido

El buscador cubre el título del álbum **y** el nombre del artista acreditado —a diferencia de
listas/favoritos, que solo cubren el título del objetivo— porque en una colección el usuario
piensa "mis discos de Radiohead" tanto como "mi copia de OK Computer". El artista ya está
disponible por el join que hoy alimenta `primaryArtistsFor`; para el `WHERE` se usa una
subconsulta escalar equivalente (`EXISTS` sobre `credit` → `artist` con `role = 'primary'` y
`recording_id IS NULL`) o el mismo left-join elevado a la consulta principal.

- `q`: `ilike(coalesce(release_group.title, ''), '%' || q || '%') OR <artista ilike ...>` —
  coincidencia parcial sin distinguir mayúsculas, sin `unaccent` (consistente con listas,
  favoritos y diario).
- `sort=alpha` opera solo sobre `release_group.title`; `sort=artist` sobre el nombre del artista.

- **Alternativa — `q` solo sobre el título (igual que listas/favoritos):** descartada para la
  colección por el modelo mental "por artista" del coleccionista; se acepta la pequeña
  divergencia entre buscadores y se documenta.
- **Alternativa — `unaccent`:** descartada por consistencia con los otros tres buscadores. Si se
  adopta, es un cambio transversal a los cuatro.

### 6. `PATCH /api/me/collection` (nivel colección) para el cambio de audiencia en lote

A diferencia de favoritos —donde `PATCH /api/me/favorites` ya existía— la colección solo tiene
`PATCH /api/me/collection/{entryId}`. Se agrega una ruta nueva `PATCH /api/me/collection` con
body `{ ids: string[] (1..50), audience: "private"|"followers"|"public" }` (schema Zod nuevo).
El servicio `updateEntriesAudienceBulk(userId, ids, audience)` hace un único
`update collection_entry set audience = :audience where id = any(:ids) and user_id = :user
returning id`. Si `returning` viene vacío → `404 COLLECTION_ENTRY_NOT_FOUND`. Los ids
ajenos/inexistentes del conjunto no entran en el `where` y se ignoran. El límite de 50 acota el
`PATCH` y el rollback optimista.

- **Alternativa — `PATCH /api/me/collection/{entryId}` con el cliente haciendo N requests:**
  descartada; N escrituras para una acción percibida como una, sin atomicidad.
- **Alternativa — `POST /api/me/collection/bulk-audience`:** descartada; `PATCH` sobre la
  colección expresa bien "cambiar audiencia de entradas" y evita otra convención de ruta.
- **Consistencia:** el `PATCH` por entrada individual (edición en línea) sigue en
  `/{entryId}` y no cambia.

### 7. Edición de entrada en línea: `CollectionEntryForm` compartido, mutación optimista

Los controles de alta de `CollectionAlbumAction` (selector de formato, toggles de atributos,
input de nota) se extraen a `CollectionEntryForm` — un componente controlado que recibe
`{ format, attributes, note }` y `onChange`, más `audience` cuando aplica. `CollectionAlbumAction`
lo consume para el alta (sin cambiar su comportamiento ni su contrato); `CollectionShelf` lo
consume dentro de un panel de edición por entrada.

"Editar" en una ficha/fila abre el panel con los valores actuales; "Guardar" llama
`updateCollectionEntry(entryId, changes)` con `onMutate` (aplica el cambio en la caché de
`queryKeys.myCollection(...)`), `onError` (revierte al snapshot) y `onSettled` (invalida). Mismo
patrón que `SaveListButton` y el selector de audiencia de favoritos. La audiencia también tiene
un selector rápido en la ficha (sin abrir el panel), igual que `FavoriteTile`.

- **Alternativa — navegar a una página de edición por entrada:** descartada; la edición es un
  ajuste puntual de 1–4 campos, no merece una ruta.

### 8. Tres tratamientos de ficha en `CollectionShelf`, un solo componente de entrada

- **`shelf`:** `<article>` en cuadrícula (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
  xl:grid-cols-5`), `CoverThumb` cuadrado (o `DiscPlaceholder` si no hay carátula), pie con
  título (enlace a `/album/{id}`), artista (enlace a `/artist/{id}`) y chip de formato. Borde a
  `amber` en `hover`/`focus-within`, sin sombra. En modo selección, casilla arriba a la
  izquierda; en edición, el panel se expande bajo la ficha ocupando el ancho de la fila.
- **`detailed`:** fila con `CoverThumb` `size-16`, título + artista, chips de formato y
  atributos, nota, audiencia + fecha, y controles (editar, selector de audiencia, quitar).
  Es esencialmente la fila actual de `CollectionList` con carátula.
- **`index`:** fila compacta `NN · Álbum — artista · formato`, `border-b`, controles en un
  contenedor `sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100`.
Todas: la imagen/placa va `aria-hidden`, el enlace primario al álbum es el título.

### 9. Perfil ajeno: misma estantería en modo lectura, sin toolbar

`users/[username]/page.tsx` deja de renderizar `CollectionList` y renderiza `CollectionShelf`
con `readOnly`: los tres tratamientos de ficha y la agrupación, "cargar más" con
`getUserCollection`, sin conmutador de modos visible (usa el default `shelf`... **decisión: sí
se muestra el conmutador también en lectura**, porque la preferencia es del visitante y global;
solo se ocultan toolbar, edición y selección). `listProfileCollection` gana el mismo `q`/`sort`
y `counts`. La matriz de visibilidad (`audiencesForProfile`) no cambia.

- **Alternativa — ruta `/users/[username]/collection` dedicada:** descartada; "cargar más"
  inline alcanza, igual que favoritos. Reabrir si se pide.

## Risks / Trade-offs

- **[La selección en lote se pierde al filtrar o recargar]** → aceptado; acción de gestión
  ocasional, no un flujo largo. Botón "Listo" explícito y salida con `Escape`, igual que
  favoritos.
- **[`group=artist` cuenta por sección sobre lo cargado, no sobre el total]** → aceptado y
  documentado; el orden estable mantiene cada artista contiguo y "cargar más" lo completa antes
  de pasar al siguiente. La precisión total por artista es un incremento posterior si se pide.
- **[`q` sobre artista diverge del buscador de listas/favoritos]** → deliberado por el modelo
  mental del coleccionista; documentado en el spec y en `docs/04-api/contracts.md`.
- **[`coalesce` de título/artista en `q`/`sort` no usa índice]** → a nivel de colección de un
  usuario (decenas a bajos cientos) el scan es barato; un índice funcional es un cambio
  posterior aislado si aparece presión real. Mismo perfil que los otros buscadores.
- **[Ampliar `PATCH /api/me/collection` como ruta nueva]** → no colisiona: hoy `/api/me/collection`
  solo tiene `GET` y `POST`; se suma `PATCH`. El `{entryId}` sigue con su `PATCH`/`DELETE`.
- **[Extraer `CollectionEntryForm` toca `CollectionAlbumAction`]** → cambio contenido: se mueve
  el JSX de los controles a un componente controlado y `CollectionAlbumAction` pasa a
  consumirlo; su test existente cubre la regresión y se mantiene verde.
- **[Reemplazar `CollectionList` toca la página de perfil]** → contenido: el perfil ya pasaba
  `readOnly`/`empty`; se sustituye el componente hijo, no la sección.
- **[Modo `shelf` como default cambia la primera impresión de la superficie]** → intencional y
  aprobado en shape; el usuario puede volver a `detailed`/`index` y la preferencia persiste.

## Migration Plan

1. Sin migraciones SQL.
2. Ampliar schema Zod (`schemas.ts`): `q`/`sort` en el request de listado, `counts` en la
   respuesta de colección propia y de perfil, schema nuevo `{ ids, audience }` para el `PATCH`
   de colección.
3. Servicios: `listOwnCollection` / `listProfileCollection` (params `q`/`sort` + orden por
   clave de grupo + `counts`), `updateEntriesAudienceBulk` (nuevo).
4. Rutas: `GET /api/me/collection` y `GET /api/users/[username]/collection` (leen `q`/`sort`,
   devuelven `counts`), `PATCH /api/me/collection` (nueva). Todo aditivo salvo la ruta nueva.
5. Capa de acceso (`src/lib/api/collection.ts`), `queryKeys.myCollection`.
6. Frontend: `collection-view-mode.ts`, `use-collection-view-mode.ts`, `CollectionModeSwitcher`,
   `CollectionEntryForm` (extraído), `CollectionShelf` + `ShelfGrid`/`EntriesDetailed`/
   `EntriesIndex`, `CollectionToolbar`, barra de acción de selección; adaptar `page.tsx` propio
   y de perfil; retirar/reducir `CollectionList`; `CollectionAlbumAction` pasa a usar
   `CollectionEntryForm`.
7. i18n, tests, docs (`contracts.md`, `physical-collection.md`, `README.md`).
8. **Rollback:** revertir el código. No hay estado nuevo que limpiar; las entradas y sus
   audiencias quedan como estaban.

## Open Questions

- **¿`group=artist` se ofrece en v1 o se difiere?** Recomendación: ofrecerlo con la semántica
  "seccionar sobre lo cargado" descrita en la decisión 3; es barato y útil. Reabrir solo si el
  conteo aproximado por sección molesta en pruebas.
- **¿El conmutador de modos se muestra en la vista de perfil ajeno?** Recomendación: sí (la
  preferencia es del visitante y global); se ocultan solo toolbar, edición y selección.
- **¿`counts` ignora el filtro `format` pero respeta `q`/`attribute`?** Recomendación: sí, como
  en la decisión 4 — el encabezado describe el conjunto mirado pero mantiene la distribución
  entre formatos.
- **¿Límite del lote en 50?** Recomendación: 50; suficiente para una limpieza de audiencia real
  y acota el rollback optimista. Igual que favoritos.
